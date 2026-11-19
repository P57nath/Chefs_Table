-- =====================================================================
-- Demo seed: "Ember & Spice" (placeholder brand, menu and prices).
-- Change everything from the Admin panel later.
-- Prices are in poisha (৳1 = 100).
-- Staff accounts are created by scripts/create-demo-staff.ts (needs the
-- auth admin API), not here.
-- =====================================================================
do $$
declare
  r   uuid := '00000000-0000-4000-8000-000000000001';
  z_main uuid; z_window uuid; z_terrace uuid;
  c_start uuid; c_main uuid; c_rice uuid; c_grill uuid; c_dessert uuid; c_drink uuid;
  i uuid; g uuid;
begin
  insert into public.restaurants (id, name, slug, tagline, vat_bps, service_charge_bps, settings)
  values (r, 'Ember & Spice', 'ember-and-spice', 'Modern Bengali kitchen & grill',
          750, 500,
          jsonb_build_object(
            'address', 'House 12, Road 7, Gulshan 1, Dhaka',
            'phone', '+880 1700-000000',
            'opening_hours', '12:00–23:00',
            'wifi', 'EmberGuest',
            'accent', '#F59E0B'));

  insert into public.zones (restaurant_id, name, sort) values (r, 'Main Hall', 1) returning id into z_main;
  insert into public.zones (restaurant_id, name, sort) values (r, 'Window', 2)    returning id into z_window;
  insert into public.zones (restaurant_id, name, sort) values (r, 'Terrace', 3)   returning id into z_terrace;

  -- Floor plan: room is 18 x 12 units; kitchen pass sits at the top (y = 0).
  insert into public.dining_tables (restaurant_id, zone_id, label, seats, shape, pos_x, pos_y, rotation, qr_token) values
    (r, z_window,  'T1',  2, 'square',  2,  3, 0, 'demo-table-01'),
    (r, z_window,  'T2',  2, 'square',  2,  6, 0, 'demo-table-02'),
    (r, z_window,  'T3',  2, 'square',  2,  9, 0, 'demo-table-03'),
    (r, z_main,    'T4',  4, 'round',   6,  4, 0, 'demo-table-04'),
    (r, z_main,    'T5',  4, 'round',   9,  4, 0, 'demo-table-05'),
    (r, z_main,    'T6',  4, 'round',  12,  4, 0, 'demo-table-06'),
    (r, z_main,    'T7',  6, 'rect',    6,  8, 0, 'demo-table-07'),
    (r, z_main,    'T8',  6, 'rect',   10,  8, 0, 'demo-table-08'),
    (r, z_main,    'T9',  8, 'rect',    8, 11, 0, 'demo-table-09'),
    (r, z_terrace, 'T10', 4, 'square', 16,  3, 0, 'demo-table-10'),
    (r, z_terrace, 'T11', 4, 'square', 16,  7, 0, 'demo-table-11'),
    (r, z_terrace, 'T12', 2, 'round',  16, 10, 0, 'demo-table-12');

  -- Categories
  insert into public.menu_categories (restaurant_id, name, name_bn, icon, sort) values
    (r, 'Starters',        'স্টার্টার',          'sparkles',       1) returning id into c_start;
  insert into public.menu_categories (restaurant_id, name, name_bn, icon, sort) values
    (r, 'Signature Mains', 'সিগনেচার মেইন',     'flame',          2) returning id into c_main;
  insert into public.menu_categories (restaurant_id, name, name_bn, icon, sort) values
    (r, 'Rice & Biryani',  'ভাত ও বিরিয়ানি',    'soup',           3) returning id into c_rice;
  insert into public.menu_categories (restaurant_id, name, name_bn, icon, sort) values
    (r, 'Grill & Burgers', 'গ্রিল ও বার্গার',    'beef',           4) returning id into c_grill;
  insert into public.menu_categories (restaurant_id, name, name_bn, icon, sort) values
    (r, 'Desserts',        'ডেজার্ট',            'ice-cream-cone', 5) returning id into c_dessert;
  insert into public.menu_categories (restaurant_id, name, name_bn, icon, sort) values
    (r, 'Drinks',          'পানীয়',              'cup-soda',       6) returning id into c_drink;

  -- Starters
  insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, price_minor, tags, spice_level, prep_minutes, sort) values
    (r, c_start, 'Beguni Basket',         'বেগুনি বাস্কেট',     'Crisp gram-flour battered aubergine with kasundi mayo.',            16000, '{veg}',              1, 10, 1),
    (r, c_start, 'Chicken Shingara Trio', 'চিকেন সিঙ্গারা',     'Three flaky shingaras stuffed with spiced minced chicken.',        18000, '{bestseller}',       1, 10, 2),
    (r, c_start, 'Fuchka Platter',        'ফুচকা প্লাটার',       'Twelve shells, tangy tamarind water, chickpeas and egg.',          22000, '{veg}',              2,  8, 3),
    (r, c_start, 'Crispy Prawn Tempura',  'চিংড়ি টেম্পুরা',     'Bay prawns in a light batter with sweet chilli dip.',              42000, '{new}',              1, 12, 4);

  -- Signature mains
  insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, price_minor, tags, spice_level, prep_minutes, sort) values
    (r, c_main, 'Beef Kala Bhuna',        'বিফ কালা ভুনা',       'Chittagong-style slow-roasted beef, dark and deeply spiced.',      52000, '{chef_special}',     2, 20, 1),
    (r, c_main, 'Shorshe Ilish',          'সর্ষে ইলিশ',          'Hilsa steamed in mustard and green chilli, served with rice.',     68000, '{chef_special}',     2, 22, 2),
    (r, c_main, 'Chicken Rezala',         'চিকেন রেজালা',        'Mild, creamy white curry with yoghurt, cashew and kewra.',         45000, '{}',                 0, 18, 3),
    (r, c_main, 'Paneer Butter Masala',   'পনির বাটার মাসালা',   'Cottage cheese in a silky tomato and butter gravy.',               38000, '{veg}',              1, 15, 4);

  -- Rice & biryani
  insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, price_minor, tags, spice_level, prep_minutes, sort) values
    (r, c_rice, 'Mutton Kacchi Biryani',  'মাটন কাচ্চি বিরিয়ানি', 'Dum-cooked basmati and tender mutton, aloo and borhani on the side.', 48000, '{bestseller}',  1, 10, 1),
    (r, c_rice, 'Beef Tehari',            'বিফ তেহারি',          'Old Dhaka style mustard-oil tehari with green chilli.',            32000, '{}',                 2, 10, 2),
    (r, c_rice, 'Chicken Roast Polao',    'চিকেন রোস্ট পোলাও',    'Fragrant chinigura polao with a festive chicken roast.',           34000, '{}',                 0, 12, 3),
    (r, c_rice, 'Plain Polao',            'সাদা পোলাও',          'Ghee-scented chinigura rice.',                                     15000, '{veg}',              0,  5, 4);

  -- Grill & burgers (with modifiers)
  insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, price_minor, tags, spice_level, prep_minutes, sort)
  values (r, c_grill, 'Ember Smash Burger', 'এম্বার স্ম্যাশ বার্গার', 'Smashed beef patty, house pickles, burnt-onion sauce, brioche.', 39000, '{bestseller}', 1, 14, 1)
  returning id into i;
    insert into public.modifier_groups (restaurant_id, item_id, name, name_bn, min_select, max_select, sort)
    values (r, i, 'Patty', 'প্যাটি', 1, 1, 1) returning id into g;
    insert into public.modifier_options (restaurant_id, group_id, name, name_bn, price_delta_minor, is_default, sort) values
      (r, g, 'Single', 'সিঙ্গেল', 0, true, 1),
      (r, g, 'Double', 'ডাবল', 15000, false, 2);
    insert into public.modifier_groups (restaurant_id, item_id, name, name_bn, min_select, max_select, sort)
    values (r, i, 'Extras', 'এক্সট্রা', 0, 3, 2) returning id into g;
    insert into public.modifier_options (restaurant_id, group_id, name, name_bn, price_delta_minor, sort) values
      (r, g, 'Cheddar cheese', 'চেডার চিজ', 6000, 1),
      (r, g, 'Fried egg', 'ডিম ভাজি', 4000, 2),
      (r, g, 'Jalapeños', 'হালাপেনো', 3000, 3);

  insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, price_minor, tags, spice_level, prep_minutes, sort)
  values (r, c_grill, 'Tandoori Chicken', 'তন্দুরি চিকেন', 'Charcoal-grilled, yoghurt and spice marinade, mint chutney.', 42000, '{}', 2, 20, 2)
  returning id into i;
    insert into public.modifier_groups (restaurant_id, item_id, name, name_bn, min_select, max_select, sort)
    values (r, i, 'Portion', 'পরিমাণ', 1, 1, 1) returning id into g;
    insert into public.modifier_options (restaurant_id, group_id, name, name_bn, price_delta_minor, is_default, sort) values
      (r, g, 'Half', 'হাফ', 0, true, 1),
      (r, g, 'Full', 'ফুল', 38000, false, 2);

  insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, price_minor, tags, spice_level, prep_minutes, sort)
  values (r, c_grill, 'Grilled Beef Steak', 'গ্রিলড বিফ স্টেক', '250 g striploin, pepper sauce, mash and greens.', 89000, '{chef_special}', 0, 25, 3)
  returning id into i;
    insert into public.modifier_groups (restaurant_id, item_id, name, name_bn, min_select, max_select, sort)
    values (r, i, 'Doneness', 'রান্নার মাত্রা', 1, 1, 1) returning id into g;
    insert into public.modifier_options (restaurant_id, group_id, name, name_bn, price_delta_minor, is_default, sort) values
      (r, g, 'Medium rare', 'মিডিয়াম রেয়ার', 0, false, 1),
      (r, g, 'Medium', 'মিডিয়াম', 0, true, 2),
      (r, g, 'Well done', 'ওয়েল ডান', 0, false, 3);

  insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, price_minor, tags, spice_level, prep_minutes, sort) values
    (r, c_grill, 'Loaded Fries', 'লোডেড ফ্রাইস', 'Fries, cheese sauce, crispy beef bits and spring onion.', 26000, '{}', 1, 10, 4);

  -- Desserts
  insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, price_minor, tags, spice_level, prep_minutes, sort) values
    (r, c_dessert, 'Mishti Doi',            'মিষ্টি দই',       'Bogura-style sweet set yoghurt in a clay pot.',        12000, '{veg}',  0, 3, 1),
    (r, c_dessert, 'Firni',                 'ফিরনি',           'Cardamom rice pudding with pistachio.',                13000, '{veg}',  0, 3, 2),
    (r, c_dessert, 'Molten Chocolate Lava', 'চকলেট লাভা কেক',  'Warm dark-chocolate cake, vanilla ice cream.',         32000, '{new}',  0, 12, 3);

  -- Drinks
  insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, price_minor, tags, spice_level, prep_minutes, sort) values
    (r, c_drink, 'Mango Lassi',   'আম লাচ্ছি',    'Thick yoghurt shake with Rajshahi mango.', 18000, '{veg,bestseller}', 0, 4, 1),
    (r, c_drink, 'Borhani',       'বোরহানি',      'Spiced yoghurt drink with mint.',          12000, '{veg}',             1, 3, 2),
    (r, c_drink, 'Mint Lemonade', 'মিন্ট লেমনেড', 'Fresh lime, mint, soda.',                  14000, '{veg}',             0, 3, 3),
    (r, c_drink, 'Masala Cha',    'মসলা চা',      'Milk tea with ginger and cardamom.',        8000, '{veg}',             0, 4, 5);

  insert into public.menu_items (restaurant_id, category_id, name, name_bn, description, price_minor, tags, spice_level, prep_minutes, sort)
  values (r, c_drink, 'Cold Coffee', 'কোল্ড কফি', 'Double-shot iced coffee with milk.', 22000, '{veg}', 0, 4, 4)
  returning id into i;
    insert into public.modifier_groups (restaurant_id, item_id, name, name_bn, min_select, max_select, sort)
    values (r, i, 'Size', 'সাইজ', 1, 1, 1) returning id into g;
    insert into public.modifier_options (restaurant_id, group_id, name, name_bn, price_delta_minor, is_default, sort) values
      (r, g, 'Regular', 'রেগুলার', 0, true, 1),
      (r, g, 'Large', 'লার্জ', 6000, false, 2);
end $$;
