import { useState } from "react";
import { usePlayerProgress, useShopEntries } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { ItemCard } from "./ItemCard";

// Reads the entries and the coin balance from the store and hands each card its two actions.
// The rules (what can be bought, what each card offers) live in the domain and the store.
export function ShopPanel() {
  const entries = useShopEntries();
  const { coins } = usePlayerProgress();
  const error = useAppStore((s) => s.error);
  const purchaseItem = useAppStore((s) => s.purchaseItem);
  const toggleEquip = useAppStore((s) => s.toggleEquip);

  // The store keeps one global `error` that the task panel also shows. Here it is shown only after
  // one of this panel's own actions failed, so a task error never appears in the shop.
  const [failed, setFailed] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setFailed(false);
    await action();
    // Read the store after the action: the `error` captured at render time is already stale.
    setFailed(useAppStore.getState().error !== null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-text-muted">Your coins</span>
        <span className="font-pixel text-sm font-bold text-coin">{coins}</span>
      </div>

      {failed && error !== null && (
        <p role="alert" className="rounded-md border border-danger px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-text-muted">Nothing for sale yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.item.id}>
              <ItemCard
                entry={entry}
                onBuy={() => void run(() => purchaseItem(entry.item.id))}
                onToggleEquip={() => void run(() => toggleEquip(entry.item.id))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
