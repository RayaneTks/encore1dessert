-- Reparation apres migration:
-- si les nouveaux prix sont restes a 0, recopier l'ancien sell_price.

update desserts
set
  sell_price_particulier = sell_price,
  sell_price_pro = sell_price
where
  coalesce(sell_price_particulier, 0) = 0
  and coalesce(sell_price_pro, 0) = 0
  and coalesce(sell_price, 0) > 0;
