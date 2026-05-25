import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchService {
  search(query: string) {
    // TODO: Use pgvector embeddings plus keyword filters for personal memory search.
    return { query, results: [] };
  }
}

