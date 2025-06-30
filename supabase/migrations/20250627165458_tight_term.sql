/*
  # Fix broken cover images with fallbacks

  1. Updates
    - Update The Great Gatsby and The Catcher in the Rye with fallback images
    - These specific images seem to be broken, so we'll use alternative URLs
*/

-- Update The Great Gatsby with a fallback image (the current CDN image appears to be broken)
UPDATE stories 
SET cover_image_url = 'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg'
WHERE title = 'The Great Gatsby';

-- Update The Catcher in the Rye with a fallback image (the current CDN image appears to be broken)  
UPDATE stories 
SET cover_image_url = 'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg'
WHERE title = 'The Catcher in the Rye';

-- Ensure To Kill a Mockingbird has a good fallback image
UPDATE stories 
SET cover_image_url = 'https://images.pexels.com/photos/1181269/pexels-photo-1181269.jpeg'
WHERE title = 'To Kill a Mockingbird' 
AND (cover_image_url IS NULL OR cover_image_url NOT LIKE '%Europe-america.b-cdn.net%');