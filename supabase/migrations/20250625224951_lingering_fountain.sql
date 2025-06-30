/*
  # Add sample stories for testing

  1. New Data
    - Sample stories from classic literature
    - Each story includes title, author, description, genre, and cover image URL
  
  2. Stories Added
    - Pride and Prejudice by Jane Austen
    - The Great Gatsby by F. Scott Fitzgerald  
    - Alice's Adventures in Wonderland by Lewis Carroll
    - To Kill a Mockingbird by Harper Lee
    - The Catcher in the Rye by J.D. Salinger
    - Wuthering Heights by Emily Brontë
*/

INSERT INTO stories (title, author, description, cover_image_url, genre, is_active) VALUES
(
  'Pride and Prejudice',
  'Jane Austen',
  'Navigate the complex social world of Regency England, where wit and romance intertwine in the drawing rooms of the English countryside. Meet Elizabeth Bennet, Mr. Darcy, and a cast of memorable characters as you explore themes of love, class, and social expectations.',
  'https://images.pexels.com/photos/1130980/pexels-photo-1130980.jpeg',
  'Romance',
  true
),
(
  'The Great Gatsby',
  'F. Scott Fitzgerald',
  'Experience the glittering world of the Jazz Age, where dreams and reality collide in the lavish parties of West Egg. Witness the rise and fall of Jay Gatsby as you navigate the excess and disillusionment of 1920s America.',
  'https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg',
  'Literary Fiction',
  true
),
(
  'Alice''s Adventures in Wonderland',
  'Lewis Carroll',
  'Tumble down the rabbit hole into a whimsical world where logic bends and imagination reigns supreme. Join Alice on her curious adventures through Wonderland, meeting the Mad Hatter, Cheshire Cat, and Queen of Hearts.',
  'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg',
  'Fantasy',
  true
),
(
  'To Kill a Mockingbird',
  'Harper Lee',
  'Step into the shoes of Scout Finch in Depression-era Alabama, where childhood innocence meets the harsh realities of prejudice and injustice. Experience a powerful story of moral courage and human dignity.',
  'https://images.pexels.com/photos/1181269/pexels-photo-1181269.jpeg',
  'Literary Fiction',
  true
),
(
  'The Catcher in the Rye',
  'J.D. Salinger',
  'Follow Holden Caulfield through his rebellious journey in New York City as he grapples with alienation, identity, and the transition from adolescence to adulthood in post-war America.',
  'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg',
  'Coming of Age',
  true
),
(
  'Wuthering Heights',
  'Emily Brontë',
  'Enter the dark and passionate world of the Yorkshire moors, where love and revenge intertwine across generations. Experience the tempestuous relationship between Heathcliff and Catherine in this Gothic romance.',
  'https://images.pexels.com/photos/1029624/pexels-photo-1029624.jpeg',
  'Gothic Romance',
  true
);