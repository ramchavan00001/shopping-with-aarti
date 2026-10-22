import type { z } from "zod";
import type {
  AdminCategory,
  AdminDeal,
  AdminEnquiry,
  AdminEvent,
  AdminReel,
  AdminStats,
  DemoContent,
  EnquiryStatus,
  categoryInput,
  lootDealInput,
  reelInput,
  saleEventInput,
  settingsInput,
} from "../../shared/admin";
import type { SiteSettings } from "../../shared/settings";

/** Thrown for problems the admin can fix (duplicate code, category in use…). */
export class AdminError extends Error {
  constructor(
    message: string,
    public status: 400 | 404 | 409 = 400,
    public field?: string,
  ) {
    super(message);
  }
}

export interface AdminStore {
  stats(days: number): Promise<AdminStats>;
  nextReelCode(): Promise<string>;

  listReels(): Promise<AdminReel[]>;
  getReel(code: string): Promise<AdminReel | undefined>;
  /** Create, or update when `originalCode` is given (the code itself may change). */
  saveReel(input: z.output<typeof reelInput>, originalCode?: string): Promise<AdminReel>;
  deleteReel(code: string): Promise<void>;

  listCategories(): Promise<AdminCategory[]>;
  saveCategory(input: z.output<typeof categoryInput>, originalSlug?: string): Promise<void>;
  deleteCategory(slug: string): Promise<void>;

  listEvents(): Promise<AdminEvent[]>;
  saveEvent(input: z.output<typeof saleEventInput>): Promise<AdminEvent>;
  deleteEvent(id: string): Promise<void>;

  listDeals(): Promise<AdminDeal[]>;
  saveDeal(input: z.output<typeof lootDealInput>): Promise<AdminDeal>;
  deleteDeal(id: string): Promise<void>;

  getSettings(): Promise<SiteSettings>;
  saveSettings(input: z.output<typeof settingsInput>): Promise<void>;

  /** Untouched demo items from the seed catalogue, and their removal. */
  demoContent(): Promise<DemoContent>;
  clearDemoContent(): Promise<DemoContent>;

  listEnquiries(): Promise<AdminEnquiry[]>;
  setEnquiryStatus(id: number, status: EnquiryStatus): Promise<void>;
}
