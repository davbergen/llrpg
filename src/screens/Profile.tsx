import React from 'react';
import type { ScreenProps, ClassType, InventoryItem, ItemRarity, EquipmentSlot } from '../types';
import {
  RPG,
  pixelBorderStyle,
  PixelHeader,
  XPBar,
  CharSprite,
  ItemIcon,
} from '../components/rpg';
import { calcStats, RARITY_DAMAGE_BONUS } from '../game/stats';

const classColors: Record<ClassType, string> = {
  mage: '#9b5de5',
  warrior: '#c44b4b',
  rogue: '#4caf50',
  scholar: '#4a9edd',
};

const classAbilities: Record<ClassType, string[]> = {
  mage: ['Arcane Grammar', 'Spell Weave', 'Kanji Mastery'],
  warrior: ['Iron Vocab', 'Battle Cry', 'Endurance'],
  rogue: ['Quick Strike', 'Shadow Step', 'Gold Rush'],
  scholar: ['Deep Study', 'Book Lore', 'Focus'],
};

const rarityColors: Record<ItemRarity, string> = {
  common: '#aaaaaa',
  uncommon: '#4caf50',
  rare: '#4a9edd',
  epic: '#9b5de5',
};

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  head: 'HEAD',
  chest: 'CHEST',
  legs: 'LEGS',
};

const SLOT_ICONS: Record<EquipmentSlot, string> = {
  head: '🪖',
  chest: '🛡',
  legs: '👢',
};

const Profile: React.FC<ScreenProps> = ({ hero, setHero, gameState, setGameState }) => {
  const heroColor = classColors[hero.classType] ?? RPG.gold;
  const abilities = classAbilities[hero.classType] ?? classAbilities.mage;
  const { damageBonus } = calcStats(hero, hero.equipment, gameState.level);

  const equipItem = (item: InventoryItem) => {
    if (!item.slot) return;
    const slot = item.slot;
    const displaced = hero.equipment[slot];
    setHero((prev) => ({
      ...prev!,
      equipment: { ...prev!.equipment, [slot]: item },
    }));
    setGameState((prev) => {
      const next = prev.inventory.filter((i) => i.id !== item.id);
      if (displaced) next.push(displaced);
      return { ...prev, inventory: next };
    });
  };

  const unequipSlot = (slot: EquipmentSlot) => {
    const item = hero.equipment[slot];
    if (!item) return;
    setHero((prev) => ({
      ...prev!,
      equipment: { ...prev!.equipment, [slot]: null },
    }));
    setGameState((prev) => ({ ...prev, inventory: [...prev.inventory, item] }));
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Hero header */}
      <div
        style={{
          background: `linear-gradient(180deg, ${heroColor}22 0%, transparent 100%)`,
          borderBottom: `3px solid ${RPG.border}`,
          padding: '20px 16px 16px',
          display: 'flex',
          gap: 14,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ position: 'relative' }}>
          <div
            style={{
              border: `3px solid ${heroColor}`,
              boxShadow: `0 0 20px ${heroColor}66`,
              background: RPG.panelDark,
              padding: 8,
            }}
          >
            <CharSprite classType={hero.classType} size={72} />
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: -6,
              right: -6,
              background: heroColor,
              border: `2px solid ${RPG.bg}`,
              fontFamily: "'Press Start 2P'",
              fontSize: 9,
              color: '#fff',
              padding: '3px 7px',
              boxShadow: `2px 2px 0 rgba(0,0,0,0.5)`,
            }}
          >
            LV{gameState.level}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 14,
              color: RPG.gold,
              marginBottom: 4,
              lineHeight: 1.4,
            }}
          >
            {hero.name}
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 9,
              color: heroColor,
              marginBottom: 10,
              textTransform: 'uppercase',
            }}
          >
            {hero.classType} CLASS
          </div>
          <XPBar xp={gameState.xp} maxXp={gameState.maxXp} level={gameState.level} />
          <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
            <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: '#f0c030' }}>
              💰 {gameState.gold}
            </span>
            <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: '#ff9a3c' }}>
              🔥 {gameState.streak}
            </span>
            {damageBonus > 0 && (
              <span style={{ fontFamily: "'Press Start 2P'", fontSize: 8, color: RPG.green }}>
                ⚔ +{damageBonus} DMG
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Class abilities */}
      <div style={{ padding: '12px 16px', borderBottom: `2px solid ${RPG.border}22` }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {abilities.map((ab, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: '8px 6px',
                textAlign: 'center',
                background: RPG.panelDark,
                border: `2px solid ${i === 0 ? heroColor : RPG.border}`,
                boxShadow: i === 0 ? `0 0 10px ${heroColor}44` : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 6,
                  color: i === 0 ? heroColor : RPG.textDim,
                  lineHeight: 1.5,
                }}
              >
                {ab}
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P'",
                  fontSize: 6,
                  color: i === 0 ? RPG.gold : RPG.textDark,
                  marginTop: 3,
                }}
              >
                {i === 0 ? 'ACTIVE' : `LV${(i + 1) * 5}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment slots */}
      <div style={{ padding: '12px 16px', borderBottom: `3px solid ${RPG.border}` }}>
        <PixelHeader size={9}>EQUIPMENT</PixelHeader>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['head', 'chest', 'legs'] as EquipmentSlot[]).map((slot) => {
            const equipped = hero.equipment[slot];
            return (
              <div
                key={slot}
                onClick={() => equipped && unequipSlot(slot)}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  background: equipped ? RPG.panelDark : '#0f0f1e',
                  border: equipped
                    ? `2px solid ${rarityColors[equipped.rarity]}`
                    : `2px dashed ${RPG.border}`,
                  boxShadow: equipped
                    ? `0 0 8px ${rarityColors[equipped.rarity]}44`
                    : 'none',
                  cursor: equipped ? 'pointer' : 'default',
                  textAlign: 'center',
                  minHeight: 72,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  position: 'relative',
                }}
              >
                <div style={{ fontFamily: "'Press Start 2P'", fontSize: 6, color: RPG.textDark }}>
                  {SLOT_LABELS[slot]}
                </div>
                {equipped ? (
                  <>
                    <ItemIcon type={equipped.type} size={28} />
                    <div
                      style={{
                        fontFamily: "'Press Start 2P'",
                        fontSize: 5,
                        color: rarityColors[equipped.rarity],
                        lineHeight: 1.4,
                        textAlign: 'center',
                      }}
                    >
                      {equipped.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Press Start 2P'",
                        fontSize: 5,
                        color: RPG.green,
                      }}
                    >
                      +{RARITY_DAMAGE_BONUS[equipped.rarity]} DMG
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 20, opacity: 0.3 }}>{SLOT_ICONS[slot]}</div>
                )}
              </div>
            );
          })}
        </div>
        {damageBonus > 0 && (
          <div
            style={{
              fontFamily: "'Press Start 2P'",
              fontSize: 7,
              color: RPG.green,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            TOTAL BONUS: +{damageBonus} DAMAGE
          </div>
        )}
      </div>

      {/* Inventory */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        <PixelHeader size={9}>INVENTORY</PixelHeader>
        {gameState.inventory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontFamily: "'Press Start 2P'", fontSize: 9, color: RPG.textDim }}>
              INVENTORY EMPTY
            </div>
            <div
              style={{
                fontFamily: "'Courier Prime', monospace",
                fontSize: 12,
                color: RPG.textDark,
                marginTop: 8,
              }}
            >
              Complete quests to earn loot!
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gameState.inventory.map((item, i) => {
              const canEquip = !!item.slot;
              return (
                <div
                  key={item.id + i}
                  onClick={() => canEquip && equipItem(item)}
                  style={{
                    ...pixelBorderStyle(rarityColors[item.rarity] ?? RPG.border, RPG.panelDark),
                    padding: '10px 12px',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    cursor: canEquip ? 'pointer' : 'default',
                    opacity: 1,
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
                        color: RPG.green,
                        padding: '2px 6px',
                        background: '#0a2a0a',
                        border: `1px solid ${RPG.green}`,
                        display: 'inline-block',
                      }}
                    >
                      {item.bonus}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div
                      style={{
                        fontFamily: "'Press Start 2P'",
                        fontSize: 6,
                        color: rarityColors[item.rarity] ?? RPG.textDim,
                        padding: '2px 5px',
                        border: `1px solid ${rarityColors[item.rarity] ?? RPG.border}`,
                        background: `${rarityColors[item.rarity] ?? RPG.border}22`,
                      }}
                    >
                      {item.rarity.toUpperCase()}
                    </div>
                    {canEquip && (
                      <div
                        style={{
                          fontFamily: "'Press Start 2P'",
                          fontSize: 6,
                          color: RPG.gold,
                          padding: '2px 5px',
                          border: `1px solid ${RPG.gold}`,
                          background: '#1a1200',
                        }}
                      >
                        EQUIP
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div
              style={{
                fontFamily: "'Press Start 2P'",
                fontSize: 7,
                color: RPG.textDim,
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              {gameState.inventory.length} / 20 ITEMS
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
