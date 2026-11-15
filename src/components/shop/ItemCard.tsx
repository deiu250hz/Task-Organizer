import type { Slot } from "../../domain/types";
import type { ShopEntry } from "../../domain/shop";
import { ACCESSORIES, ACCESSORY_PALETTE } from "../character/accessories";
import { PixelSprite } from "../character/PixelSprite";

export interface ItemCardProps {
  entry: ShopEntry;
  onBuy: () => void;
  onToggleEquip: () => void;
}

const SLOT_LABEL: Record<Slot, string> = {
  hat: "Hat",
  glasses: "Glasses",
  held: "Held item",
  background: "Background",
};

// The icon box is 56 px wide. One sprite pixel is a whole number of screen pixels (so icons stay crisp),
// as many as fit in 52 px: a 12 px laptop is x4, 10 px glasses x5, a 16 px background thumbnail x3.
const ICON_FIT = 52;
const iconScale = (icon: readonly string[]) =>
  Math.max(1, Math.floor(ICON_FIT / Math.max(icon.length, ...icon.map((row) => row.length))));

// Presentational: the entry says what the card offers (buy, locked, equip, unequip); the parent runs the actions.
export function ItemCard({ entry, onBuy, onToggleEquip }: ItemCardProps) {
  const { item, state, missingCoins, requiredLevel } = entry;
  const icon = ACCESSORIES[item.assetKey]?.icon;
  const noteId = `shop-note-${item.id}`;
  const owned = state === "equip" || state === "unequip";

  const note =
    state === "locked-level"
      ? `Unlocks at level ${requiredLevel}`
      : state === "locked-coins"
        ? `Need ${missingCoins} more ${missingCoins === 1 ? "coin" : "coins"}`
        : null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface-raised p-2.5">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-bg" aria-hidden="true">
        {icon !== undefined && (
          <PixelSprite grid={icon} palette={ACCESSORY_PALETTE} size={Math.max(...icon.map((row) => row.length)) * iconScale(icon)} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-pixel text-sm font-bold text-text">{item.name}</p>
        <p className="text-xs text-text-muted">
          {SLOT_LABEL[item.slot]}
          {!owned && (
            <>
              {" · "}
              <span className="font-pixel font-bold text-coin">{item.price}</span> coins
            </>
          )}
          {state === "unequip" && (
            <>
              {" · "}
              <span className="font-bold text-xp">Equipped</span>
            </>
          )}
        </p>
        {note !== null && (
          <p id={noteId} className="text-xs text-text-muted">
            {note}
          </p>
        )}
      </div>

      {owned ? (
        <button
          type="button"
          onClick={onToggleEquip}
          aria-label={`${state === "unequip" ? "Unequip" : "Equip"} ${item.name}`}
          className={`shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
            state === "unequip"
              ? "border-xp text-xp hover:bg-bg"
              : "border-border-strong text-text hover:border-accent hover:text-accent"
          }`}
        >
          {state === "unequip" ? "Unequip" : "Equip"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onBuy}
          disabled={state !== "buy"}
          aria-label={`Buy ${item.name} for ${item.price} coins`}
          aria-describedby={note !== null ? noteId : undefined}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent"
        >
          Buy
        </button>
      )}
    </div>
  );
}
