import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Coins, PackageOpen, ShoppingBag, Sparkles } from 'lucide-react';
import { FullPlayerState } from '../types/system';
import { SystemFrame } from './SystemFrame';
import { ITEMS_CATALOG } from '../shared/systemData';
import { soundEngine } from '../lib/sound';

interface InventoryViewProps {
  state: FullPlayerState;
  busy: boolean;
  onOpenLootBox: () => Promise<{ label: string; rarity: string } | null>;
  onUseOrEquipItem: (itemId: string) => Promise<void>;
}

export function InventoryView({
  state,
  busy,
  onOpenLootBox,
  onUseOrEquipItem,
}: InventoryViewProps) {
  const [filter, setFilter] = useState<string>('All');
  const [boxResult, setBoxResult] = useState<{ label: string; rarity: string } | null>(null);

  const categories = ['All', 'Loot Box', 'Consumable', 'Equipment', 'Collectible', 'Cosmetic', 'Theme'];

  const enriched = state.inventory
    .map((entry) => ({
      entry,
      def: ITEMS_CATALOG.find((i) => i.id === entry.itemId),
    }))
    .filter((x) => x.def && (filter === 'All' || x.def.category === filter));

  return (
    <div className="space-y-6">
      <SystemFrame className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono-tabular text-xs tracking-widest text-[#67E8F9] uppercase">
              Player Storage
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">Inventory</h1>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`min-h-[38px] border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === cat
                    ? 'border-[#38BDF8] bg-[#38BDF8]/20 text-[#F8FAFC]'
                    : 'border-[#2879B7]/35 bg-[#050A13]/70 text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </SystemFrame>

      {enriched.length === 0 ? (
        <SystemFrame className="p-10 text-center">
          <PackageOpen className="mx-auto h-10 w-10 text-[#64748B]" />
          <p className="mt-3 text-sm text-[#94A3B8]">
            No digital items in this category yet. Complete Daily Quests or visit the System Shop to acquire rewards.
          </p>
        </SystemFrame>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map(({ entry, def }) => {
            if (!def) return null;
            const isLootBox = def.id === 'random_loot_box';
            const isEquippedTheme = def.themeKey && state.profile.activeTheme === def.themeKey;
            const isEquippedFrame = def.frameKey && state.profile.activeAvatarFrame === def.frameKey;

            return (
              <SystemFrame
                key={entry.id}
                variant={def.rarity === 'Monarch' ? 'monarch' : def.rarity === 'Legendary' ? 'gold' : 'default'}
                className="flex flex-col justify-between p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#67E8F9]">
                      {def.category} · {def.rarity}
                    </span>
                    <span className="font-mono-tabular font-bold text-[#F8FAFC]">×{entry.quantity}</span>
                  </div>

                  {isLootBox && (
                    <img
                      src="/src/assets/images/loot_box_system_1794898198087.jpg"
                      alt="System Supply Box"
                      referrerPolicy="no-referrer"
                      className="mt-3 h-32 w-full border border-[#2879B7]/40 object-cover"
                    />
                  )}

                  <h3 className="mt-3 font-display text-lg font-bold text-[#F8FAFC]">{def.name}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">{def.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#2879B7]/25">
                  {isLootBox ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        soundEngine.playRewardReveal();
                        const res = await onOpenLootBox();
                        if (res) setBoxResult(res);
                      }}
                      className="min-h-[42px] w-full border border-[#FACC15] bg-[#FACC15]/20 text-xs font-bold tracking-wider text-[#FACC15] hover:bg-[#FACC15]/30"
                    >
                      OPEN SUPPLY BOX
                    </button>
                  ) : def.themeKey || def.frameKey ? (
                    <button
                      type="button"
                      disabled={busy || Boolean(isEquippedTheme || isEquippedFrame)}
                      onClick={() => {
                        soundEngine.playTap();
                        onUseOrEquipItem(def.id);
                      }}
                      className="min-h-[42px] w-full border border-[#38BDF8]/60 bg-[#38BDF8]/15 text-xs font-semibold text-[#F8FAFC] disabled:opacity-50"
                    >
                      {isEquippedTheme || isEquippedFrame ? 'EQUIPPED' : 'EQUIP'}
                    </button>
                  ) : def.category === 'Consumable' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        soundEngine.playNotification();
                        onUseOrEquipItem(def.id);
                      }}
                      className="min-h-[42px] w-full border border-[#4ADE80]/60 bg-[#4ADE80]/15 text-xs font-semibold text-[#4ADE80]"
                    >
                      USE ELIXIR
                    </button>
                  ) : (
                    <p className="text-center text-xs text-[#94A3B8]">Digital Collectible</p>
                  )}
                </div>
              </SystemFrame>
            );
          })}
        </div>
      )}

      {/* Loot Box Result Reveal Modal */}
      <AnimatePresence>
        {boxResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <SystemFrame variant="gold" scanBeam className="w-full max-w-md p-8 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-[#FACC15]" />
              <p className="mt-3 font-mono-tabular text-xs tracking-widest text-[#FACC15]">
                [LOOT BOX REWARD]
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-[#F8FAFC]">{boxResult.label}</h2>
              <p className="mt-1 text-xs text-[#67E8F9]">Rarity: {boxResult.rarity}</p>
              <button
                type="button"
                onClick={() => setBoxResult(null)}
                className="mt-6 min-h-[44px] border border-[#FACC15] bg-[#FACC15]/20 px-8 py-2 text-xs font-bold tracking-wider text-[#FACC15]"
              >
                COLLECT
              </button>
            </SystemFrame>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ShopViewProps {
  state: FullPlayerState;
  busy: boolean;
  onBuyItem: (itemId: string) => Promise<void>;
}

export function ShopView({ state, busy, onBuyItem }: ShopViewProps) {
  const [category, setCategory] = useState('All');
  const shopItems = ITEMS_CATALOG.filter(
    (i) => i.priceGold > 0 && (category === 'All' || i.category === category)
  );

  return (
    <div className="space-y-6">
      <SystemFrame variant="gold" className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono-tabular text-xs tracking-widest text-[#FACC15] uppercase">
              System Exchange
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-[#F8FAFC]">System Shop</h1>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Exchange earned Gold for digital themes, avatar cosmetics, collectibles, and Supply Boxes.
            </p>
          </div>
          <div className="flex items-center gap-2 border border-[#FACC15]/50 bg-[#050A13]/80 px-5 py-3">
            <Coins className="h-5 w-5 text-[#FACC15]" />
            <span className="font-mono-tabular text-xl font-bold text-[#FACC15]">
              {state.status.gold.toLocaleString()} GOLD
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {['All', 'Theme', 'Cosmetic', 'Collectible', 'Equipment', 'Consumable', 'Loot Box'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`min-h-[38px] border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                category === cat
                  ? 'border-[#FACC15] bg-[#FACC15]/20 text-[#FACC15]'
                  : 'border-[#2879B7]/35 bg-[#050A13]/70 text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </SystemFrame>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shopItems.map((item) => {
          const canAfford = state.status.gold >= item.priceGold;
          return (
            <SystemFrame key={item.id} className="flex flex-col justify-between p-5">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#67E8F9]">
                    {item.category} · {item.rarity}
                  </span>
                  <span className="font-mono-tabular font-bold text-[#FACC15]">
                    {item.priceGold} GOLD
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg font-bold text-[#F8FAFC]">{item.name}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">{item.description}</p>
              </div>
              <button
                type="button"
                disabled={busy || !canAfford}
                onClick={() => {
                  soundEngine.playRewardReveal();
                  onBuyItem(item.id);
                }}
                className="mt-4 flex min-h-[42px] w-full items-center justify-center gap-2 border border-[#38BDF8]/60 bg-[#38BDF8]/15 text-xs font-bold text-[#F8FAFC] hover:bg-[#38BDF8]/25 disabled:opacity-40"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>{canAfford ? `PURCHASE (${item.priceGold} GOLD)` : 'INSUFFICIENT GOLD'}</span>
              </button>
            </SystemFrame>
          );
        })}
      </div>
    </div>
  );
}
