/**
 * Clean slug utilities for Rentivo properties
 * Generates SEO-friendly, clean slugs directly from listing titles with NO trailing numbers or IDs.
 */

export function slugifyPropertyTitle(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/['’"]/g, '') // remove quotes/apostrophes
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // strip leading/trailing hyphens
}

export function getListingPath(listing: { title: string; id?: string }): string {
  const slug = slugifyPropertyTitle(listing.title);
  return slug ? `/property/${slug}` : (listing.id ? `/listings/${listing.id}` : '/search');
}
