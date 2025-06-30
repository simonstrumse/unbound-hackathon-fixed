-- Remove duplicate stories (keep the one with the best cover image)
WITH ranked_stories AS (
  SELECT 
    id,
    title,
    author,
    ROW_NUMBER() OVER (
      PARTITION BY title, author 
      ORDER BY 
        CASE 
          WHEN cover_image_url LIKE '%Europe-america.b-cdn.net%' THEN 1
          ELSE 2
        END,
        created_at ASC
    ) as rn
  FROM stories
)
DELETE FROM stories 
WHERE id IN (
  SELECT id 
  FROM ranked_stories 
  WHERE rn > 1
);

-- Update any remaining placeholder images with CDN images where available
UPDATE stories 
SET cover_image_url = 'https://Europe-america.b-cdn.net/optimized/The%20Great%20Gatsby.webp'
WHERE title = 'The Great Gatsby' 
AND (cover_image_url IS NULL OR cover_image_url NOT LIKE '%Europe-america.b-cdn.net%');

UPDATE stories 
SET cover_image_url = 'https://Europe-america.b-cdn.net/optimized/The%20Catcher%20in%20the%20Rye.webp'
WHERE title = 'The Catcher in the Rye'
AND (cover_image_url IS NULL OR cover_image_url NOT LIKE '%Europe-america.b-cdn.net%');

-- Note: To Kill a Mockingbird doesn't have a matching CDN image, so we'll keep its current image