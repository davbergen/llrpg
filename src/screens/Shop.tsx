import React, { useMemo, useState } from 'react';
import type { ItemRarity, ScreenProps, InventoryItem } from '../types';
import {
  RPG,
  pixelBorderStyle,
  PixelHeader,
  PixelPanel,
  PixelButton,
  ItemIcon,
} from '../components/rpg';
import { rollShop, SHOP_REROLL_COST } from '../game/shop-roller';
import { dayKey } from '../game/streak';

const rarityColors: Record<ItemRarity, string> = {
  common: '#aaaaaa',
  uncommon: '#4caf50',
  rare: '#4a9edd',
  epic: '#9b5de5',
};

/** Buy prices — gold sink calibrated against new gold drop rates. */
const BUY_PRICE: Record<ItemRarity, number> = {
  common: 25,
  uncommon: 60,
  rare: 200,
  epic: 9999, // not actually purchasable; epics are excluded from the shop pool
};

interface ShopProps extends ScreenProps {
  userId: string;
}

const Shop: React.FC<ShopProps> = ({ gameState, setGameState, userId }) => {
  const today = dayKey(Date.now());

  // Reset shop state if a new day started since the last visit.
  const shopState =
    gameState.shop.date === today
      ? gameState.shop
      : { date: today, rerollCount: 0, purchasedIds: [] };

  const items = useMemo(
    () => rollShop(today, userId, shopState.rerollCount),
    [today, userId, shopState.rerollCount],
  );

  const purchased = new Set(shopState.purchasedIds);
  const visibleItems = items.filter((it) => !purchased.has(it.id));

  const [confirm, setConfirm] = useState<InventoryItem | null>(null);

  const handleReroll = () => {
    if (gameState.gold < SHOP_REROLL_COST) return;
    setGameState((prev) => ({
      ...prev,
      gold: prev.gold - SHOP_REROLL_COST,
      shop: {
        date: today,
        rerollCount: (prev.shop.date === today ? prev.shop.rerollCount : 0) + 1,
        purchasedIds: prev.shop.date === today ? prev.shop.purchasedIds : [],
      },
    }));
  };

  const handleBuy = (item: InventoryItem) => {
    const price = BUY_PRICE[item.rarity];
    if (gameState.gold < price) return;
    setGameState((prev) => {
      const prevShop =
        prev.shop.date === today
          ? prev.shop
          : { date: today, rerollCount: 0, purchasedIds: [] };
      return {
        ...prev,
        gold: prev.gold - price,
        inventory: [...prev.inventory, item],
        shop: { ...prevShop, purchasedIds: [...prevShop.purchasedIds, item.id] },
      };
    });
    setConfirm(null);
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <PixelHeader size={12}>🛒 ITEM SHOP</PixelHeader>

      <PixelPanel
        dark
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
        }}
      >
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.textDim }}>
          GOLD
        </span>
        <span style={{ fontFamily: "'Press Start 2P'", fontSize: 12, color: RPG.gold }}>
          💰 {gameState.gold}
        </span>
      </PixelPanel>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleItems.length === 0 ? (
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 9,
              color: RPG.textDim,
              textAlign: 'center',
              padding: 24,
            }}
          >
            SOLD OUT — try a reroll or come back tomorrow
          </div>
        ) : (
          visibleItems.map((item) => {
            const price = BUY_PRICE[item.rarity];
            const canAfford = gameState.gold >= price;
            return (
              <div
                key={item.id}
                style={{
                  ...pixelBorderStyle(rarityColors[item.rarity], RPG.panelDark),
                  padding: '10px 12px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <ItemIcon type={item.type} size={40} />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P'",
                      fontSize: 9,
                      color: RPG.text,
                      marginBottom: 3,
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P'",
                      fontSize: 7,
                      color: RPG.textDim,
                      marginBottom: 5,
                    }}
                  >
                    {item.jp}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Press Start 2P'",
                      fontSize: 7,
                      color: rarityColors[item.rarity],
                    }}
                  >
                    {item.rarity.toUpperCase()} · {item.bonus}
                  </div>
                </div>
                <PixelButton
                  small
                  variant={canAfford ? 'gold' : 'grey'}
                  onClick={() => canAfford && setConfirm(item)}
                  disabled={!canAfford}
                >
                  💰 {price}
                </PixelButton>
              </div>
            );
          })
        )}
      </div>

      <PixelButton
        variant={gameState.gold >= SHOP_REROLL_COST ? 'blue' : 'grey'}
        disabled={gameState.gold < SHOP_REROLL_COST}
        onClick={handleReroll}
        style={{ width: '100%' }}
      >
        🔄 REROLL ({SHOP_REROLL_COST}g)
      </PixelButton>
      <div
        style={{
          fontFamily: "'Press Start 2P'",
          fontSize: 6,
          color: RPG.textDark,
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        Stock refreshes daily at 4am. Reroll history resets each day.
      </div>

      {confirm && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 100,
          }}
        >
          <PixelPanel gold style={{ width: '100%', maxWidth: 320 }}>
            <PixelHeader size={11}>CONFIRM PURCHASE</PixelHeader>
            <div
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 12,
                color: RPG.text,
                lineHeight: 1.5,
                marginBottom: 14,
              }}
            >
              Buy <b>{confirm.name}</b> for <b>{BUY_PRICE[confirm.rarity]}g</b>?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <PixelButton
                onClick={() => handleBuy(confirm)}
                variant="green"
                style={{ width: '100%' }}
              >
                💰 BUY
              </PixelButton>
              <PixelButton onClick={() => setConfirm(null)} variant="grey" style={{ width: '100%' }}>
                CANCEL
              </PixelButton>
            </div>
          </PixelPanel>
        </div>
      )}
    </div>
  );
};

export default Shop;
