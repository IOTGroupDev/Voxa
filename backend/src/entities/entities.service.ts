import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityRelationType, EntityType, Prisma } from '@prisma/client';
import { LlmService } from '../llm/llm.service';
import { PrismaService } from '../prisma/prisma.service';

interface ExtractEntitiesInput {
  userId: string;
  noteId: string;
  transcriptId?: string | null;
  memoryEventId: string;
  recordingId?: string | null;
  text: string;
}

interface ExtractedEntity {
  name: string;
  type: EntityType;
  summary: string;
  confidence: number;
}

interface ExtractedRelation {
  sourceName: string;
  targetName: string;
  relationType: EntityRelationType;
  confidence: number;
}

@Injectable()
export class EntitiesService {
  private readonly logger = new Logger(EntitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
  ) {}

  async list(supabaseUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseUserId } });
    if (!user) return [];

    const entities = await this.prisma.entity.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        mentions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: { select: { mentions: true } },
      },
    });

    return entities.map((entity) => ({
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      normalizedName: entity.normalizedName,
      type: entity.type,
      summary: entity.summary,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      latestActivity: entity.mentions[0]?.createdAt.toISOString() ?? entity.updatedAt.toISOString(),
      mentionsCount: entity._count.mentions,
    }));
  }

  async get(supabaseUserId: string, id: string) {
    const entity = await this.findOwnedEntity(supabaseUserId, id);
    return {
      ...entity,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  async getMemories(supabaseUserId: string, id: string) {
    await this.findOwnedEntity(supabaseUserId, id);

    return this.prisma.entityMention.findMany({
      where: {
        entityId: id,
        user: { supabaseUserId },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        note: {
          include: {
            actionItems: true,
            reminders: true,
          },
        },
        transcript: true,
        recording: {
          include: {
            transcript: true,
            memoryEvent: {
              include: {
                note: {
                  include: {
                    actionItems: true,
                    reminders: true,
                  },
                },
              },
            },
          },
        },
        memoryEvent: {
          include: {
            recording: { include: { transcript: true } },
            note: {
              include: {
                actionItems: true,
                reminders: true,
              },
            },
            memoryThread: true,
          },
        },
      },
    });
  }

  async getRelations(supabaseUserId: string, id: string) {
    const entity = await this.findOwnedEntity(supabaseUserId, id);

    return this.prisma.entityRelation.findMany({
      where: {
        userId: entity.userId,
        OR: [{ sourceEntityId: id }, { targetEntityId: id }],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        sourceEntity: true,
        targetEntity: true,
      },
    });
  }

  async getRelated(supabaseUserId: string, id: string) {
    const relations = await this.getRelations(supabaseUserId, id);
    return relations.map((relation) => ({
      relation: {
        id: relation.id,
        userId: relation.userId,
        sourceEntityId: relation.sourceEntityId,
        targetEntityId: relation.targetEntityId,
        relationType: relation.relationType,
        confidence: relation.confidence,
        createdAt: relation.createdAt.toISOString(),
        updatedAt: relation.updatedAt.toISOString(),
      },
      entity: serializeEntity(relation.sourceEntityId === id ? relation.targetEntity : relation.sourceEntity),
      direction: relation.sourceEntityId === id ? 'outgoing' : 'incoming',
    }));
  }

  async extractAndLink(input: ExtractEntitiesInput) {
    const text = input.text.trim();
    if (!text) return [];

    let extracted: ExtractedEntity[];
    try {
      extracted = await this.extractEntities(text);
    } catch (error) {
      this.logger.error(
        `Entity extraction failed noteId=${input.noteId} memoryEventId=${input.memoryEventId} error=${formatError(error)}`,
      );
      return [];
    }

    const meaningful = extracted.filter((entity) => entity.name.trim().length > 1 && entity.confidence >= 0.35);
    if (!meaningful.length) {
      this.logger.log(`No entities extracted noteId=${input.noteId} memoryEventId=${input.memoryEventId}`);
      return [];
    }

    const existing = await this.prisma.entity.findMany({ where: { userId: input.userId } });
    const linked = [];

    for (const candidate of meaningful) {
      const entity = await this.findOrCreateEntity(input.userId, candidate, existing);
      if (!existing.some((item) => item.id === entity.id)) {
        existing.push(entity);
      }

      const mention = await this.linkMention(entity.id, input, candidate.confidence);
      linked.push({ entity, mention });
    }

    await this.extractAndLinkRelations(input.userId, text, linked.map((item) => item.entity));

    this.logger.log(
      `Entity extraction completed noteId=${input.noteId} memoryEventId=${input.memoryEventId} extracted=${meaningful.length} linked=${linked.length}`,
    );
    return linked;
  }

  private async extractAndLinkRelations(userId: string, text: string, entities: ExistingEntity[]) {
    if (entities.length < 2) return [];

    let relations: ExtractedRelation[];
    try {
      relations = await this.extractRelations(text, entities);
    } catch (error) {
      this.logger.error(`Entity relation extraction failed userId=${userId} error=${formatError(error)}`);
      return [];
    }

    const linked = [];
    for (const relation of relations.filter((item) => item.confidence >= 0.7)) {
      const source = findMatchingEntity(relation.sourceName, entities);
      const target = findMatchingEntity(relation.targetName, entities);
      if (!source || !target || source.id === target.id) continue;

      linked.push(await this.linkRelation(userId, source.id, target.id, relation));
    }

    if (linked.length) {
      this.logger.log(`Entity relations linked userId=${userId} relations=${linked.length}`);
    }

    return linked;
  }

  private async extractRelations(text: string, entities: ExistingEntity[]): Promise<ExtractedRelation[]> {
    const { answer } = await this.llmService.generateAnswer({
      question: 'Detect relationships between the provided entities.',
      context: [
        `Text:\n${text}`,
        `Entities:\n${entities.map((entity) => `- ${entity.name} (${entity.type})`).join('\n')}`,
      ].join('\n\n'),
      systemPrompt: ENTITY_RELATION_SYSTEM_PROMPT,
    });
    const payload = parseRelationJson(answer);
    return payload.relations
      .map((relation) => ({
        sourceName: sanitizeName(relation.sourceName),
        targetName: sanitizeName(relation.targetName),
        relationType: isRelationType(relation.relationType) ? relation.relationType : EntityRelationType.other,
        confidence: clampConfidence(relation.confidence),
      }))
      .filter((relation) => relation.sourceName && relation.targetName);
  }

  private async linkRelation(
    userId: string,
    sourceEntityId: string,
    targetEntityId: string,
    relation: ExtractedRelation,
  ) {
    const existing = await this.prisma.entityRelation.findUnique({
      where: {
        userId_sourceEntityId_targetEntityId_relationType: {
          userId,
          sourceEntityId,
          targetEntityId,
          relationType: relation.relationType,
        },
      },
    });

    if (existing) {
      return this.prisma.entityRelation.update({
        where: { id: existing.id },
        data: {
          confidence: Math.max(existing.confidence, relation.confidence),
        },
      });
    }

    return this.prisma.entityRelation.create({
      data: {
        userId,
        sourceEntityId,
        targetEntityId,
        relationType: relation.relationType,
        confidence: relation.confidence,
      },
    });
  }

  private async extractEntities(text: string): Promise<ExtractedEntity[]> {
    const { answer } = await this.llmService.generateAnswer({
      question: 'Extract memory entities from the provided text.',
      context: text,
      systemPrompt: ENTITY_EXTRACTION_SYSTEM_PROMPT,
    });
    const payload = parseEntityJson(answer);
    return payload.entities
      .map((entity) => ({
        name: sanitizeName(entity.name),
        type: isEntityType(entity.type) ? entity.type : EntityType.other,
        summary: typeof entity.summary === 'string' ? entity.summary.trim() : '',
        confidence: clampConfidence(entity.confidence),
      }))
      .filter((entity) => entity.name.length > 0);
  }

  private async findOrCreateEntity(userId: string, candidate: ExtractedEntity, existing: ExistingEntity[]) {
    const normalizedName = normalizeEntityName(candidate.name);
    const match = findMatchingEntity(candidate.name, existing, candidate.confidence);
    if (match) {
      const shouldUpdateSummary = candidate.summary && (!match.summary || candidate.summary.length > match.summary.length);
      return this.prisma.entity.update({
        where: { id: match.id },
        data: {
          normalizedName: match.normalizedName || normalizedName,
          type: match.type === EntityType.other && candidate.type !== EntityType.other ? candidate.type : undefined,
          summary: shouldUpdateSummary ? candidate.summary : undefined,
        },
      });
    }

    return this.prisma.entity.create({
      data: {
        userId,
        name: candidate.name,
        normalizedName,
        type: candidate.type,
        summary: candidate.summary || undefined,
      },
    });
  }

  private async linkMention(entityId: string, input: ExtractEntitiesInput, confidence: number) {
    const existing = await this.prisma.entityMention.findFirst({
      where: {
        entityId,
        OR: [
          { noteId: input.noteId },
          input.transcriptId ? { transcriptId: input.transcriptId } : undefined,
          { memoryEventId: input.memoryEventId },
          input.recordingId ? { recordingId: input.recordingId } : undefined,
        ].filter(Boolean) as Prisma.EntityMentionWhereInput[],
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.entityMention.create({
      data: {
        userId: input.userId,
        entityId,
        noteId: input.noteId,
        transcriptId: input.transcriptId ?? undefined,
        memoryEventId: input.memoryEventId,
        recordingId: input.recordingId ?? undefined,
        confidence,
      },
    });
  }

  private async findOwnedEntity(supabaseUserId: string, id: string) {
    const entity = await this.prisma.entity.findFirst({
      where: { id, user: { supabaseUserId } },
    });

    if (!entity) {
      throw new NotFoundException('Entity not found.');
    }

    return entity;
  }
}

const ENTITY_EXTRACTION_SYSTEM_PROMPT = [
  'You are Voxa.',
  '',
  'Extract real-life memory objects from the user text.',
  '',
  'Return only meaningful entities that may be useful in the future.',
  '',
  'Do not extract generic words.',
  '',
  'Examples of good entities:',
  '- Honda Accord',
  '- Voxa',
  '- AstraLink',
  '- кот',
  '- давление',
  '- донгл',
  '- кухня',
  '',
  'Return JSON only:',
  '',
  '{',
  '  "entities": [',
  '    {',
  '      "name": string,',
  '      "type": "person" | "project" | "vehicle" | "pet" | "health" | "place" | "device" | "home" | "idea" | "organization" | "other",',
  '      "summary": string,',
  '      "confidence": number',
  '    }',
  '  ]',
  '}',
].join('\n');

const ENTITY_RELATION_SYSTEM_PROMPT = [
  'You are Voxa.',
  '',
  'Detect meaningful relationships between extracted memory objects.',
  '',
  'Use only provided text and provided entities.',
  '',
  'Do not invent relationships.',
  '',
  'Return JSON only:',
  '',
  '{',
  '  "relations": [',
  '    {',
  '      "sourceName": "string",',
  '      "targetName": "string",',
  '      "relationType": "related_to | part_of | belongs_to | works_on | owns | uses | discussed_with | affects | located_at | other",',
  '      "confidence": 0.0',
  '    }',
  '  ]',
  '}',
].join('\n');

type ExistingEntity = {
  id: string;
  name: string;
  normalizedName: string;
  type: EntityType;
  summary: string | null;
};

type EntityJsonPayload = {
  entities: Array<{
    name: unknown;
    type: unknown;
    summary: unknown;
    confidence: unknown;
  }>;
};

type RelationJsonPayload = {
  relations: Array<{
    sourceName: unknown;
    targetName: unknown;
    relationType: unknown;
    confidence: unknown;
  }>;
};

function parseEntityJson(answer: string): EntityJsonPayload {
  const cleaned = cleanJsonAnswer(answer);
  const parsed = JSON.parse(cleaned) as Partial<EntityJsonPayload>;
  return { entities: Array.isArray(parsed.entities) ? parsed.entities : [] };
}

function parseRelationJson(answer: string): RelationJsonPayload {
  const cleaned = cleanJsonAnswer(answer);
  const parsed = JSON.parse(cleaned) as Partial<RelationJsonPayload>;
  return { relations: Array.isArray(parsed.relations) ? parsed.relations : [] };
}

function cleanJsonAnswer(answer: string) {
  return answer
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function sanitizeName(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 120);
}

function isEntityType(value: unknown): value is EntityType {
  return typeof value === 'string' && Object.values(EntityType).includes(value as EntityType);
}

function isRelationType(value: unknown): value is EntityRelationType {
  return typeof value === 'string' && Object.values(EntityRelationType).includes(value as EntityRelationType);
}

function clampConfidence(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return Math.max(0, Math.min(1, numeric));
}

function findMatchingEntity(name: string, existing: ExistingEntity[], confidence = 1) {
  const normalized = normalizeEntityName(name);
  const exact = existing.find((entity) => entity.normalizedName === normalized || normalizeEntityName(entity.name) === normalized);
  if (exact) return exact;

  if (confidence < 0.75) return undefined;

  return existing.find((entity) => areSimilarEntityNames(normalized, entity.normalizedName || normalizeEntityName(entity.name)));
}

function normalizeEntityName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function areSimilarEntityNames(a: string, b: string) {
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) >= 4;

  const aTokens = new Set(a.split(' '));
  const bTokens = new Set(b.split(' '));
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;

  return union > 0 && intersection / union >= 0.8;
}

function serializeEntity(entity: ExistingEntity & { userId?: string; createdAt?: Date; updatedAt?: Date }) {
  return {
    id: entity.id,
    userId: entity.userId,
    name: entity.name,
    normalizedName: entity.normalizedName,
    type: entity.type,
    summary: entity.summary,
    createdAt: entity.createdAt?.toISOString(),
    updatedAt: entity.updatedAt?.toISOString(),
  };
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
