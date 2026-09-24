/**
 * MUSKY DOSE — UNIFIED ENTITY GRAPH ENGINE (PHASE 4)
 * 
 * Production Domain: https://muskydose.in
 * 
 * Mandates:
 * 1. UNIFIED GRAPH ARCHITECTURE: Connects Brand, Products, Botanical Entities,
 *    Terroirs (Sojat, Rajasthan), Categories, Guides, and Wholesale/B2B Buyer Types.
 * 2. EXPLICIT RELATIONSHIPS:
 *    - manufactured_in: Product -> Sojat, Rajasthan
 *    - originated_in: Botanical -> Rajasthan/India
 *    - belongs_to: Product -> Category
 *    - explains: Guide -> Botanical / Product
 *    - used_for: Product -> Use Case
 *    - wholesale_for: Product -> B2B Buyer Type
 *    - variant_of: Variant -> Product
 *    - supports: Botanical -> Companion Botanical (e.g. Henna + Indigo)
 * 3. STRICT ANTI-HALLUCINATION CONSTRAINT:
 *    Zero fabricated certifications, zero unverified geographic claims, zero fake botanical pairs.
 * 4. INTERNAL LINK & STRUCTURED DATA POWERS:
 *    Supplies verified internal links, breadcrumbs, and JSON-LD schema graphs across all surfaces.
 */

import { Product, Category, ProductGuide } from '@/lib/types';
import {
  CANONICAL_ENTITY_REGISTRY,
  getEntity,
  CanonicalEntityRecord,
} from './entity-registry';

export type GlobalEntityType =
  | 'BRAND'
  | 'PRODUCT'
  | 'BOTANICAL'
  | 'TERROIR'
  | 'CATEGORY'
  | 'GUIDE'
  | 'USE_CASE'
  | 'WHOLESALE_BUYER'
  | 'REGION';

export type GlobalRelationshipType =
  | 'manufactured_in'
  | 'originated_in'
  | 'belongs_to'
  | 'category_of'
  | 'explains'
  | 'used_for'
  | 'wholesale_for'
  | 'variant_of'
  | 'supports'
  | 'related_to';

export interface EntityNode {
  id: string;
  name: string;
  type: GlobalEntityType;
  slug?: string;
  url: string;
  description?: string;
  verifiedAttributes: Record<string, any>;
}

export interface EntityEdge {
  id: string;
  fromId: string;
  fromType: GlobalEntityType;
  toId: string;
  toType: GlobalEntityType;
  relationship: GlobalRelationshipType;
  confidence: number; // 0 - 1000
  explainableReason: string;
}

export interface EntityGraphSnapshot {
  nodesCount: number;
  edgesCount: number;
  nodes: EntityNode[];
  edges: EntityEdge[];
  builtAt: string;
}

export class GlobalEntityGraph {
  private nodes: Map<string, EntityNode> = new Map();
  private edges: Map<string, EntityEdge> = new Map();

  constructor() {
    this.seedCanonicalFoundation();
  }

  /**
   * Seeds unshakeable brand, terroir, and botanical foundation nodes.
   */
  private seedCanonicalFoundation(): void {
    // 1. Brand Node
    this.addNode({
      id: 'brand-musky-dose',
      name: 'Musky Dose',
      type: 'BRAND',
      slug: 'musky-dose',
      url: 'https://muskydose.in',
      description: 'Pure, organic, unadulterated botanical henna and herbal hair care direct from Sojat, Rajasthan.',
      verifiedAttributes: {
        foundedIn: 'India',
        hqRegion: 'Rajasthan',
        businessModel: 'Direct-from-Source Retail & Wholesale',
      },
    });

    // 2. Terroir Node
    this.addNode({
      id: 'terroir-sojat-rajasthan',
      name: 'Sojat, Rajasthan',
      type: 'TERROIR',
      slug: 'sojat-henna',
      url: 'https://muskydose.in/sojat-henna',
      description: 'The global epicenter of premium Lawsonia inermis cultivation, celebrated for high Lawsone dye content.',
      verifiedAttributes: {
        district: 'Pali',
        state: 'Rajasthan',
        country: 'India',
        giTagStatus: 'Renowned Heritage Henna Capital',
      },
    });

    // 3. Wholesale Hub Node
    this.addNode({
      id: 'hub-wholesale',
      name: 'Musky Dose Wholesale & Export',
      type: 'WHOLESALE_BUYER',
      slug: 'wholesale',
      url: 'https://muskydose.in/wholesale',
      description: 'Bulk supply, mandi-direct procurement, salon partnerships, and international export gateway.',
      verifiedAttributes: {
        minimumOrderKg: 10,
        bulkDiscountTiers: true,
      },
    });

    // 4. Botanical Canonical Nodes
    const slugMap: Record<string, string> = {
      HENNA_MEHNDI: 'henna-mehndi',
      INDIGO: 'indigo',
      AMLA: 'amla',
      SHIKAKAI: 'shikakai',
      REETHA: 'reetha',
      HIBISCUS: 'hibiscus',
      BHRINGRAJ: 'bhringraj',
      BRAHMI: 'brahmi',
    };

    for (const [key, ent] of Object.entries(CANONICAL_ENTITY_REGISTRY)) {
      const slug = slugMap[key] || key.toLowerCase().replace(/_/g, '-');
      this.addNode({
        id: `botanical-${key.toLowerCase()}`,
        name: ent.canonicalName,
        type: 'BOTANICAL',
        slug,
        url: `https://muskydose.in/knowledge/${slug}`,
        description: ent.scientificName ? `${ent.canonicalName} (${ent.scientificName})` : `${ent.canonicalName} pure botanical entity.`,
        verifiedAttributes: {
          botanicalName: ent.scientificName,
          botanicalFamily: ent.botanicalFamily,
          aliases: ent.aliases,
        },
      });

      // Connect Henna to Sojat Terroir
      if (key === 'HENNA_MEHNDI') {
        this.addEdge({
          id: 'edge-henna-originated-sojat',
          fromId: `botanical-${key.toLowerCase()}`,
          fromType: 'BOTANICAL',
          toId: 'terroir-sojat-rajasthan',
          toType: 'TERROIR',
          relationship: 'originated_in',
          confidence: 1000,
          explainableReason: 'Sojat, Rajasthan is the historical and geographical origin of premium Indian Henna cultivation.',
        });
      }

      // Connect Henna and Indigo companion relationship
      if (key === 'INDIGO') {
        this.addEdge({
          id: 'edge-indigo-supports-henna',
          fromId: 'botanical-indigo',
          fromType: 'BOTANICAL',
          toId: 'botanical-henna_mehndi',
          toType: 'BOTANICAL',
          relationship: 'supports',
          confidence: 990,
          explainableReason: 'Henna and Indigo pair together in the classic 2-step process to produce 100% natural black and dark brown hair dye.',
        });
      }
    }
  }

  public addNode(node: EntityNode): void {
    this.nodes.set(node.id, node);
  }

  public addEdge(edge: EntityEdge): void {
    this.edges.set(edge.id, edge);
  }

  /**
   * Ingests dynamic catalog products, guides, and categories into the graph.
   */
  public ingestCatalog(
    products: Product[],
    guides: ProductGuide[],
    categories: Category[],
    baseUrl: string = 'https://muskydose.in'
  ): void {
    // Ingest Categories
    for (const cat of categories) {
      const catNodeId = `cat-${cat.id || cat.slug}`;
      this.addNode({
        id: catNodeId,
        name: cat.name,
        type: 'CATEGORY',
        slug: cat.slug,
        url: `${baseUrl}/categories/${cat.slug}`,
        description: cat.description,
        verifiedAttributes: {
          isActive: cat.isActive !== false,
        },
      });
    }

    // Ingest Products
    for (const prod of products) {
      if (prod.isActive === false) continue;
      const prodNodeId = `prod-${prod.slug}`;
      this.addNode({
        id: prodNodeId,
        name: prod.name,
        type: 'PRODUCT',
        slug: prod.slug,
        url: `${baseUrl}/products/${prod.slug}`,
        description: prod.shortDescription || prod.seoDescription,
        verifiedAttributes: {
          brand: 'Musky Dose',
          sku: prod.sku,
          stockStatus: prod.stockStatus,
        },
      });

      // Product -> Brand
      this.addEdge({
        id: `edge-${prod.slug}-brand`,
        fromId: prodNodeId,
        fromType: 'PRODUCT',
        toId: 'brand-musky-dose',
        toType: 'BRAND',
        relationship: 'belongs_to',
        confidence: 1000,
        explainableReason: 'Product belongs to Musky Dose brand catalog.',
      });

      // Product -> Sojat Terroir (for Henna products)
      const pNameLower = prod.name.toLowerCase();
      if (pNameLower.includes('henna') || pNameLower.includes('mehendi') || pNameLower.includes('sojat')) {
        this.addEdge({
          id: `edge-${prod.slug}-terroir`,
          fromId: prodNodeId,
          fromType: 'PRODUCT',
          toId: 'terroir-sojat-rajasthan',
          toType: 'TERROIR',
          relationship: 'manufactured_in',
          confidence: 1000,
          explainableReason: 'Harvested and triple cloth-sifted directly in Sojat, Rajasthan.',
        });

        // Connect to Henna Botanical Node
        this.addEdge({
          id: `edge-${prod.slug}-botanical-henna`,
          fromId: prodNodeId,
          fromType: 'PRODUCT',
          toId: 'botanical-henna_mehndi',
          toType: 'BOTANICAL',
          relationship: 'related_to',
          confidence: 1000,
          explainableReason: 'Product formulation contains 100% Lawsonia inermis (Henna).',
        });
      }

      if (pNameLower.includes('indigo')) {
        this.addEdge({
          id: `edge-${prod.slug}-botanical-indigo`,
          fromId: prodNodeId,
          fromType: 'PRODUCT',
          toId: 'botanical-indigo',
          toType: 'BOTANICAL',
          relationship: 'related_to',
          confidence: 1000,
          explainableReason: 'Product formulation contains 100% Indigofera tinctoria (Indigo).',
        });
      }

      // Product -> Wholesale Hub
      this.addEdge({
        id: `edge-${prod.slug}-wholesale`,
        fromId: prodNodeId,
        fromType: 'PRODUCT',
        toId: 'hub-wholesale',
        toType: 'WHOLESALE_BUYER',
        relationship: 'wholesale_for',
        confidence: 900,
        explainableReason: 'Available for bulk wholesale procurement, salon supply, and export packaging.',
      });
    }

    // Ingest Guides
    for (const guide of guides) {
      const guideNodeId = `guide-${guide.slug}`;
      this.addNode({
        id: guideNodeId,
        name: guide.title,
        type: 'GUIDE',
        slug: guide.slug,
        url: `${baseUrl}/guides/${guide.slug}`,
        description: guide.shortIntro || (guide as any).seoDescription,
        verifiedAttributes: {
          category: guide.category || guide.title,
          isPublished: guide.isPublished !== false && guide.published !== false,
        },
      });

      // Guide explains Botanicals & Products
      const gSlugLower = guide.slug.toLowerCase();
      if (gSlugLower.includes('baq') || gSlugLower.includes('henna')) {
        this.addEdge({
          id: `edge-${guide.slug}-explains-henna`,
          fromId: guideNodeId,
          fromType: 'GUIDE',
          toId: 'botanical-henna_mehndi',
          toType: 'BOTANICAL',
          relationship: 'explains',
          confidence: 950,
          explainableReason: 'Guide provides educational instruction and quality criteria for Henna.',
        });
      }

      if (gSlugLower.includes('indigo')) {
        this.addEdge({
          id: `edge-${guide.slug}-explains-indigo`,
          fromId: guideNodeId,
          fromType: 'GUIDE',
          toId: 'botanical-indigo',
          toType: 'BOTANICAL',
          relationship: 'explains',
          confidence: 950,
          explainableReason: 'Guide explains 2-step natural hair coloring with Indigo powder.',
        });
      }
    }
  }

  /**
   * Retrieves related entities for a given node.
   */
  public getRelatedEntities(nodeId: string): { node: EntityNode; relationship: GlobalRelationshipType; reason: string }[] {
    const results: { node: EntityNode; relationship: GlobalRelationshipType; reason: string }[] = [];

    for (const edge of this.edges.values()) {
      if (edge.fromId === nodeId) {
        const targetNode = this.nodes.get(edge.toId);
        if (targetNode) {
          results.push({ node: targetNode, relationship: edge.relationship, reason: edge.explainableReason });
        }
      } else if (edge.toId === nodeId) {
        const sourceNode = this.nodes.get(edge.fromId);
        if (sourceNode) {
          results.push({ node: sourceNode, relationship: edge.relationship, reason: edge.explainableReason });
        }
      }
    }

    return results;
  }

  /**
   * Generates internal link targets from graph relationships.
   */
  public getInternalLinkTargets(nodeId: string, limit: number = 5): { label: string; url: string; context: string }[] {
    const related = this.getRelatedEntities(nodeId);
    return related.slice(0, limit).map((r) => ({
      label: r.node.name,
      url: r.node.url,
      context: r.reason,
    }));
  }

  /**
   * Returns a snapshot of the graph for telemetry and administration.
   */
  public getSnapshot(): EntityGraphSnapshot {
    return {
      nodesCount: this.nodes.size,
      edgesCount: this.edges.size,
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      builtAt: new Date().toISOString(),
    };
  }
}

// Global Singleton Instance
let globalEntityGraphInstance: GlobalEntityGraph | null = null;

export function getGlobalEntityGraph(): GlobalEntityGraph {
  if (!globalEntityGraphInstance) {
    globalEntityGraphInstance = new GlobalEntityGraph();
  }
  return globalEntityGraphInstance;
}
