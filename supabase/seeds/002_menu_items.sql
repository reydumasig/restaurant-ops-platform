-- Menu dish products (from the two menu-board photos) + Halo-Halo/Mais con Yelo.
-- Recipes/BOM for these come in a later phase-1 milestone (Basic Production).

insert into item_categories (name, item_type) values
  ('Add-Ons', 'product'),
  ('All Day Breakfast', 'product'),
  ('Best Sellers', 'product'),
  ('Dessert', 'product'),
  ('Family Set Meals', 'product'),
  ('New', 'product'),
  ('Regular Order', 'product'),
  ('Sizzlers', 'product'),
  ('Solo Kamayan', 'product'),
  ('Specialty', 'product')
on conflict (name, item_type) do nothing;

insert into products (sku, name, category_id, unit_id, price) values
  ('SKU-SINIGANG-NA-LECHON-KAWALI-SA-WATERMELON', 'Sinigang na Lechon Kawali sa Watermelon', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 435),
  ('SKU-SINIGANG-NA-SALMON', 'Sinigang na Salmon', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 289),
  ('SKU-SINIGANG-NA-HIPON', 'Sinigang na Hipon', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 349),
  ('SKU-KILAWIN-BANGUS-SPECIALTY', 'Kilawin Bangus Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 349),
  ('SKU-BANGUS-SISIG-SPECIALTY', 'Bangus Sisig Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 369),
  ('SKU-SIZZLING-PORK-SISIG-SPECIALTY', 'Sizzling Pork Sisig Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 369),
  ('SKU-PAKBET-WITH-LECHON-KAWALI-SPECIALTY', 'Pakbet with Lechon Kawali Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 349),
  ('SKU-CRISPY-KARE-KARE-SPECIALTY', 'Crispy Kare Kare Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 435),
  ('SKU-CRISPY-PATA-SPECIALTY', 'Crispy Pata Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 899),
  ('SKU-BULALO-SPECIALTY', 'Bulalo Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 345),
  ('SKU-CRISPY-HIPON-SPECIALTY', 'Crispy Hipon Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 345),
  ('SKU-CHICKEN-BUFFALO-SPECIALTY', 'Chicken Buffalo Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 399),
  ('SKU-MIXED-SEAFOODS-SPECIALTY', 'Mixed Seafoods Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 485),
  ('SKU-CHOPSUEY-SEAFOODS-SPECIALTY', 'Chopsuey Seafoods Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 399),
  ('SKU-FRIED-HITO-SPECIALTY', 'Fried Hito Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 399),
  ('SKU-BUTTERED-GARLIC-SHRIMP-SPECIALTY', 'Buttered Garlic Shrimp Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 399),
  ('SKU-FRIED-CHICKEN-SPECIALTY', 'Fried Chicken Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 369),
  ('SKU-CHICHARON-BULAKLAK-SPECIALTY', 'Chicharon Bulaklak Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 399),
  ('SKU-LECHON-KAWALI-SPECIALTY', 'Lechon Kawali Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 399),
  ('SKU-CALAMARES-SPECIALTY', 'Calamares Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 299),
  ('SKU-GRILLED-SQUID-SPECIALTY-2-PCS', 'Grilled Squid Specialty (2 pcs)', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 299),
  ('SKU-PORK-BBQ-SPECIALTY-PER-PIECE', 'Pork BBQ (Specialty, per piece)', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 39),
  ('SKU-CHICKEN-INASAL-SOLO', 'Chicken Inasal Solo', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 139),
  ('SKU-GRILLED-LIEMPO-SPECIALTY-2-PCS', 'Grilled Liempo Specialty (2 pcs)', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 289),
  ('SKU-FRIED-BANGUS-SPECIALTY', 'Fried Bangus Specialty', (select id from item_categories where name = 'Specialty' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 349),
  ('SKU-SIZZLING-PORK-SISIG-BEST-SELLER', 'Sizzling Pork Sisig Best Seller', (select id from item_categories where name = 'Best Sellers' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 185),
  ('SKU-PORK-BBQ-BEST-SELLER', 'Pork BBQ Best Seller', (select id from item_categories where name = 'Best Sellers' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 185),
  ('SKU-CHICKEN-INASAL-BEST-SELLER', 'Chicken Inasal Best Seller', (select id from item_categories where name = 'Best Sellers' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 185),
  ('SKU-PORK-LIEMPO-BEST-SELLER', 'Pork Liempo Best Seller', (select id from item_categories where name = 'Best Sellers' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 195),
  ('SKU-SINIGANG-NA-TUNA-NEW-MENU', 'Sinigang na Tuna New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 399),
  ('SKU-KILAWIN-NA-TUNA-NEW-MENU', 'Kilawin na Tuna New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 399),
  ('SKU-SEAFOOD-KARE-KARE-NEW-MENU', 'Seafood Kare Kare New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 485),
  ('SKU-PANSIT-SEAFOODS-NEW-MENU', 'Pansit Seafoods New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 399),
  ('SKU-HONEY-BUTTERED-CHICKEN-NEW-MENU', 'Honey Buttered Chicken New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 399),
  ('SKU-BBQ-SISIG-NEW-MENU', 'BBQ Sisig New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 349),
  ('SKU-BEEF-PIGAR-PIGAR-NEW-MENU', 'Beef Pigar Pigar New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 479),
  ('SKU-BEEF-BROCCOLI-NEW-MENU', 'Beef Broccoli New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 419),
  ('SKU-KILAWIN-KAMBING-NEW-MENU', 'Kilawin Kambing New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 349),
  ('SKU-SINAMPALUKAN-KAMBING-NEW-MENU', 'Sinampalukan Kambing New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 379),
  ('SKU-KALDERETA-KAMBING-NEW-MENU', 'Kaldereta Kambing New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 399),
  ('SKU-BULALO-BONE-MARROW-NEW-MENU', 'Bulalo Bone Marrow New Menu', (select id from item_categories where name = 'New' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 449),
  ('SKU-SIZZLING-SAUSAGE-SIZZLERS', 'Sizzling Sausage Sizzlers', (select id from item_categories where name = 'Sizzlers' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 209),
  ('SKU-SIZZLING-CHICKEN-SIZZLERS', 'Sizzling Chicken Sizzlers', (select id from item_categories where name = 'Sizzlers' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 185),
  ('SKU-SIZZLING-PORKCHOP-SIZZLERS', 'Sizzling Porkchop Sizzlers', (select id from item_categories where name = 'Sizzlers' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 195),
  ('SKU-SIZZLING-LECHON-KAWALI-SIZZLERS', 'Sizzling Lechon Kawali Sizzlers', (select id from item_categories where name = 'Sizzlers' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 195),
  ('SKU-SIZZLING-LIEMPO-SIZZLERS', 'Sizzling Liempo Sizzlers', (select id from item_categories where name = 'Sizzlers' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 209),
  ('SKU-SIZZLING-BULALO-SIZZLERS', 'Sizzling Bulalo Sizzlers', (select id from item_categories where name = 'Sizzlers' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 255),
  ('SKU-CHICKEN-INASAL-SOLO-KAMAYAN', 'Chicken Inasal Solo Kamayan', (select id from item_categories where name = 'Solo Kamayan' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 309),
  ('SKU-PORK-BBQ-SOLO-KAMAYAN', 'Pork BBQ Solo Kamayan', (select id from item_categories where name = 'Solo Kamayan' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 309),
  ('SKU-PORK-LIEMPO-SOLO-KAMAYAN', 'Pork Liempo Solo Kamayan', (select id from item_categories where name = 'Solo Kamayan' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 325),
  ('SKU-TAPSILOG-ALL-DAY-BREAKFAST', 'Tapsilog All Day Breakfast', (select id from item_categories where name = 'All Day Breakfast' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 185),
  ('SKU-PORKSILOG-ALL-DAY-BREAKFAST', 'Porksilog All Day Breakfast', (select id from item_categories where name = 'All Day Breakfast' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 185),
  ('SKU-TOCILOG-ALL-DAY-BREAKFAST', 'Tocilog All Day Breakfast', (select id from item_categories where name = 'All Day Breakfast' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 159),
  ('SKU-HOTSILOG-ALL-DAY-BREAKFAST', 'Hotsilog All Day Breakfast', (select id from item_categories where name = 'All Day Breakfast' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 185),
  ('SKU-LONGSILOG-ALL-DAY-BREAKFAST', 'Longsilog All Day Breakfast', (select id from item_categories where name = 'All Day Breakfast' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 185),
  ('SKU-BANGSILOG-ALL-DAY-BREAKFAST', 'Bangsilog All Day Breakfast', (select id from item_categories where name = 'All Day Breakfast' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 195),
  ('SKU-CHICKEN-INASAL-REGULAR-ORDER', 'Chicken Inasal Regular Order', (select id from item_categories where name = 'Regular Order' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 160),
  ('SKU-PORK-BBQ-REGULAR-ORDER', 'Pork BBQ Regular Order', (select id from item_categories where name = 'Regular Order' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 160),
  ('SKU-SIZZLING-PORK-SISIG-REGULAR-ORDER', 'Sizzling Pork Sisig Regular Order', (select id from item_categories where name = 'Regular Order' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 160),
  ('SKU-PORK-LIEMPO-REGULAR-ORDER', 'Pork Liempo Regular Order', (select id from item_categories where name = 'Regular Order' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 170),
  ('SKU-RICE-ADD-ON', 'Rice (Add-On)', (select id from item_categories where name = 'Add-Ons' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 30),
  ('SKU-AGAMANG-ADD-ON', 'Agamang (Add-On)', (select id from item_categories where name = 'Add-Ons' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 29),
  ('SKU-BURO-ADD-ON', 'Buro (Add-On)', (select id from item_categories where name = 'Add-Ons' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 59),
  ('SKU-ITLOG-MAALAT-ADD-ON', 'Itlog Maalat (Add-On)', (select id from item_categories where name = 'Add-Ons' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 39),
  ('SKU-EGG-ADD-ON', 'Egg (Add-On)', (select id from item_categories where name = 'Add-Ons' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 30),
  ('SKU-SINGKAMAS-ADD-ON', 'Singkamas (Add-On)', (select id from item_categories where name = 'Add-Ons' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 115),
  ('SKU-PIPINO-ADD-ON', 'Pipino (Add-On)', (select id from item_categories where name = 'Add-Ons' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 115),
  ('SKU-ENSALADA-TALONG-ADD-ON', 'Ensalada Talong (Add-On)', (select id from item_categories where name = 'Add-Ons' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 169),
  ('SKU-FAMILY-SET-A', 'Family Set A', (select id from item_categories where name = 'Family Set Meals' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 2935),
  ('SKU-FAMILY-SET-B', 'Family Set B', (select id from item_categories where name = 'Family Set Meals' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 3129),
  ('SKU-FAMILY-SET-C', 'Family Set C', (select id from item_categories where name = 'Family Set Meals' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 3113),
  ('SKU-FAMILY-SET-D', 'Family Set D', (select id from item_categories where name = 'Family Set Meals' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 3794),
  ('SKU-KAMAYAN-A', 'Kamayan A', (select id from item_categories where name = 'Family Set Meals' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 805),
  ('SKU-KAMAYAN-B', 'Kamayan B', (select id from item_categories where name = 'Family Set Meals' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 1149),
  ('SKU-KAMAYAN-C', 'Kamayan C', (select id from item_categories where name = 'Family Set Meals' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 1609),
  ('SKU-KAMAYAN-D', 'Kamayan D', (select id from item_categories where name = 'Family Set Meals' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 2585),
  ('SKU-HALO-HALO-OVERLOAD', 'Halo-Halo Overload', (select id from item_categories where name = 'Dessert' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 149),
  ('SKU-MAIS-CON-YELO', 'Mais con Yelo', (select id from item_categories where name = 'Dessert' and item_type = 'product'), (select id from units_of_measure where abbreviation = 'pc'), 119)
on conflict (sku) do nothing;

update products set price = 119 where sku = 'SKU-RC-COLA-PRODUCTS-BOTTLE-1-5L';
update products set price = 20 where sku = 'SKU-RC-COLA-PRODUCTS-BOTTLE-8OZ';
update products set price = 689 where sku = 'SKU-ALFONSO-1L-BOTTLE';
update products set price = 349 where sku = 'SKU-MOJITO-1L-BOTTLE';
update products set price = 25 where sku = 'SKU-GLAZIER-WATER-BOTTLE-350-ML';
update products set price = 95 where sku = 'SKU-SAN-MIGUEL-RED-HORSE-STALLION-BOTTLE-330ML';
update products set price = 95 where sku = 'SKU-SAN-MIGUEL-PALE-PILSEN-BOTTLE-330ML';
update products set price = 95 where sku = 'SKU-SAN-MIGUEL-LIGHTS-BOTTLE-330ML';
update products set price = 119 where sku = 'SKU-LECHE-FLAN-DESSERT';
update products set price = 399 where sku = 'SKU-ICE-CREAM-ASSORTED-GALLON-1-9L';
update products set price = 35 where sku = 'SKU-ICE-CREAM-ASSORTED';