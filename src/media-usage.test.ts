import { describe, expect, it } from 'vitest';
import { contentReferencesMedia } from './media-usage';

describe('media usage detection', () => {
  const media = {
    path: '123-photo.jpg',
    publicUrl: 'https://project.supabase.co/storage/v1/object/public/content-media/123-photo.jpg'
  };

  it('finds media nested in draft galleries and published image fields', () => {
    expect(contentReferencesMedia({ images: [{ src: media.publicUrl }] }, media)).toBe(true);
    expect(contentReferencesMedia({ imageUrl: `${media.publicUrl}?v=2` }, media)).toBe(true);
  });

  it('does not match a different media path', () => {
    expect(contentReferencesMedia({ imageUrl: `${media.publicUrl}-other` }, media)).toBe(false);
  });
});
