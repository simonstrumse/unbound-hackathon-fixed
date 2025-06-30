/*
  # Update Story Cover Images and Add New Classic Stories

  1. Updates
    - Update existing stories with correct cover images from CDN
    - Add new classic literature stories with proper cover images

  2. Changes
    - Update Pride and Prejudice, Alice in Wonderland, and Wuthering Heights cover images
    - Add 16 new classic stories with matching cover images from CDN
*/

-- Update cover images for existing stories
UPDATE stories 
SET cover_image_url = 'https://Europe-america.b-cdn.net/optimized/Pride%20and%20Prejudice.webp'
WHERE title = 'Pride and Prejudice';

UPDATE stories 
SET cover_image_url = 'https://Europe-america.b-cdn.net/optimized/Alice%20in%20wonderland.webp'
WHERE title = 'Alice''s Adventures in Wonderland' OR title = 'Alice in Wonderland';

UPDATE stories 
SET cover_image_url = 'https://Europe-america.b-cdn.net/optimized/wuthering%20heights.webp'
WHERE title = 'Wuthering Heights';

-- Add new classic stories with their cover images (only if they don't already exist)
INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'Emma', 'Jane Austen', 'Follow the well-meaning but often misguided Emma Woodhouse as she navigates love, friendship, and the complexities of matchmaking in Regency England.', 'https://Europe-america.b-cdn.net/optimized/Emma.webp', 'Romance', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'Emma');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'Sense and Sensibility', 'Jane Austen', 'Experience the contrasting temperaments of the Dashwood sisters as they navigate love, loss, and societal expectations in this tale of sense versus sensibility.', 'https://Europe-america.b-cdn.net/optimized/Sense%20and%20Sensibility.webp', 'Romance', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'Sense and Sensibility');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'Persuasion', 'Jane Austen', 'Join Anne Elliot in this poignant story of second chances and enduring love, as she reconnects with a former lover eight years after their separation.', 'https://Europe-america.b-cdn.net/optimized/persuasion.webp', 'Romance', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'Persuasion');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'Jane Eyre', 'Charlotte Brontë', 'Follow the passionate and independent Jane Eyre as she faces hardship, finds love, and struggles to maintain her integrity in Victorian England.', 'https://Europe-america.b-cdn.net/optimized/jane%20eyre.webp', 'Gothic Romance', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'Jane Eyre');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'Frankenstein', 'Mary Shelley', 'Enter the dark world of Victor Frankenstein and his monstrous creation in this groundbreaking tale of science, ambition, and the consequences of playing God.', 'https://Europe-america.b-cdn.net/optimized/frankenstein.webp', 'Gothic Horror', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'Frankenstein');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'Dracula', 'Bram Stoker', 'Journey into the shadowy world of Count Dracula and the brave souls who seek to stop his reign of terror in this classic tale of horror and suspense.', 'https://Europe-america.b-cdn.net/optimized/Dracula.webp', 'Gothic Horror', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'Dracula');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'The Picture of Dorian Gray', 'Oscar Wilde', 'Explore themes of beauty, morality, and corruption as young Dorian Gray pursues a life of hedonism while his portrait bears the marks of his sins.', 'https://Europe-america.b-cdn.net/optimized/The%20Picture%20of%20Dorian%20Gray.webp', 'Gothic Fiction', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'The Picture of Dorian Gray');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'The Strange Case of Dr. Jekyll and Mr. Hyde', 'Robert Louis Stevenson', 'Delve into the dual nature of humanity in this chilling tale of Dr. Jekyll''s transformation into the sinister Mr. Hyde.', 'https://Europe-america.b-cdn.net/optimized/The%20Strange%20Case%20of%20Dr.%20Jekyll%20and%20Mr.%20Hyde.webp', 'Gothic Horror', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'The Strange Case of Dr. Jekyll and Mr. Hyde');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'Treasure Island', 'Robert Louis Stevenson', 'Set sail on a thrilling adventure with young Jim Hawkins as he searches for buried treasure and faces dangerous pirates led by the infamous Long John Silver.', 'https://Europe-america.b-cdn.net/optimized/Teasure%20Island.webp', 'Adventure', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'Treasure Island');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', 'Join the brilliant detective Sherlock Holmes and Dr. Watson as they solve mysterious crimes and puzzles in Victorian London.', 'https://Europe-america.b-cdn.net/optimized/The%20Adventures%20of%20Sherlock%20Holmes.webp', 'Mystery', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'The Adventures of Sherlock Holmes');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'A Study in Scarlet', 'Arthur Conan Doyle', 'Witness the first meeting of Sherlock Holmes and Dr. Watson as they solve their inaugural case together in this foundational detective story.', 'https://Europe-america.b-cdn.net/optimized/A%20Study%20in%20Scarlet.webp', 'Mystery', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'A Study in Scarlet');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'The Hound of the Baskervilles', 'Arthur Conan Doyle', 'Accompany Holmes and Watson to the mysterious moors of Dartmoor as they investigate the supernatural threat haunting the Baskerville family.', 'https://Europe-america.b-cdn.net/optimized/the%20hound%20of%20baskervilles.webp', 'Mystery', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'The Hound of the Baskervilles');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'Moby Dick', 'Herman Melville', 'Join Captain Ahab''s obsessive quest for the great white whale in this epic tale of adventure, obsession, and the struggle between man and nature.', 'https://Europe-america.b-cdn.net/optimized/Moby%20dick.webp', 'Adventure', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'Moby Dick');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'The Adventures of Tom Sawyer', 'Mark Twain', 'Experience the mischievous adventures of Tom Sawyer along the Mississippi River in this beloved coming-of-age tale.', 'https://Europe-america.b-cdn.net/optimized/The%20aventures%20of%20tom%20sawyer.webp', 'Adventure', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'The Adventures of Tom Sawyer');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'The Adventures of Huckleberry Finn', 'Mark Twain', 'Follow Huck Finn and Jim on their journey down the Mississippi River in this powerful story about friendship, freedom, and moral growth.', 'https://Europe-america.b-cdn.net/optimized/The%20Adventures%20of%20Huckleberry%20Finn.webp', 'Adventure', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'The Adventures of Huckleberry Finn');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'Little Women', 'Louisa May Alcott', 'Join the March sisters - Jo, Meg, Beth, and Amy - as they navigate the challenges of growing up during the American Civil War.', 'https://Europe-america.b-cdn.net/optimized/little%20women.webp', 'Coming of Age', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'Little Women');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'Anne of Green Gables', 'L.M. Montgomery', 'Follow the spirited and imaginative Anne Shirley as she finds a home and family at Green Gables in Prince Edward Island.', 'https://Europe-america.b-cdn.net/optimized/Anne%20of%20green%20gables.webp', 'Coming of Age', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'Anne of Green Gables');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'Peter Pan', 'J.M. Barrie', 'Fly away to Neverland with Wendy, John, and Michael Darling as they join Peter Pan in his magical world of pirates, fairies, and endless adventure.', 'https://Europe-america.b-cdn.net/optimized/Peter%20Pan.webp', 'Fantasy', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'Peter Pan');

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active)
SELECT 'The Wind in the Willows', 'Kenneth Grahame', 'Join Mole, Rat, Badger, and the irrepressible Toad in their adventures along the riverbank in this charming tale of friendship and nature.', 'https://Europe-america.b-cdn.net/optimized/The%20Wind%20in%20the%20Willows.webp', 'Fantasy', true
WHERE NOT EXISTS (SELECT 1 FROM stories WHERE title = 'The Wind in the Willows');