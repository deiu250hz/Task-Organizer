import { useState } from "react";
import { Panel } from "../layout/Panel";
import { SPECIES_LABEL } from "../../domain/species";
import { useEquipped, usePetMood, usePetOneShot, usePlayerProgress } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { ShopPanel } from "../shop/ShopPanel";
import { Character } from "./Character";
import { PanelTabs, PET_TABPANEL_ID, petTabId, type PanelTab } from "./PanelTabs";
import { PetPicker } from "./PetPicker";

interface StatTileProps {
  label: string;
  value: string;
  valueClass: string;
}

function StatTile({ label, value, valueClass }: StatTileProps) {
  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2 text-center">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`font-pixel text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

export function CharacterPanel() {
  // Level, XP, coins and streak are derived from the ledger totals held in the store.
  const { level, intoLevel, needed, coins, streak } = usePlayerProgress();
  const equipped = useEquipped(); // what the pet wears, from the shop inventory
  const mood = usePetMood();
  const oneShot = usePetOneShot();
  const stage = useAppStore((s) => s.displayStage);
  const dequeueOneShot = useAppStore((s) => s.dequeueOneShot);
  const species = useAppStore((s) => s.species);
  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const chooseSpecies = useAppStore((s) => s.chooseSpecies);

  // Only this panel cares whether the picker is open after the first run, so it stays local state.
  const [choosing, setChoosing] = useState(false);
  // Wait for the saved choice before deciding, so returning players never see the picker flash.
  const showPicker = settingsLoaded && (species === null || choosing);
  // Which tab is open under the pet: also local, since nothing else needs it.
  const [tab, setTab] = useState<PanelTab>("stats");

  const percent = Math.round((intoLevel / needed) * 100); // needed is always at least 100

  return (
    <Panel id="character-heading" title={species === null ? "Pet" : SPECIES_LABEL[species]}>
      {!settingsLoaded ? (
        // Same size as the pet (192 px), so nothing jumps when the saved choice arrives.
        <div className="mx-auto h-48 w-48" aria-hidden="true" />
      ) : showPicker ? (
        <PetPicker
          current={species}
          onChoose={(chosen) => {
            void chooseSpecies(chosen);
            setChoosing(false);
          }}
          onCancel={species === null ? undefined : () => setChoosing(false)}
        />
      ) : (
        species !== null && (
          <div className="mx-auto w-fit">
            <Character
              species={species}
              stage={stage}
              mood={mood}
              equipped={equipped}
              oneShot={oneShot}
              onOneShotDone={dequeueOneShot}
            />
            <button
              type="button"
              onClick={() => setChoosing(true)}
              className="mx-auto mt-2 block rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:text-accent"
            >
              Change pet
            </button>
          </div>
        )
      )}

      <PanelTabs active={tab} onChange={setTab} />

      <div id={PET_TABPANEL_ID} role="tabpanel" aria-labelledby={petTabId(tab)} className="mt-4">
        {tab === "stats" ? (
          <>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-accent px-2 py-0.5 font-pixel text-sm font-bold text-on-accent">
                LVL {level}
              </span>
              <span className="font-pixel text-xs text-text-muted">
                {intoLevel} / {needed} XP
              </span>
            </div>

            <div
              role="progressbar"
              aria-label="Experience"
              aria-valuemin={0}
              aria-valuemax={needed}
              aria-valuenow={intoLevel}
              aria-valuetext={`${intoLevel} of ${needed} XP`}
              className="mt-2 h-3 overflow-hidden rounded-full border border-border bg-bg"
            >
              {/* The width animates; the global reduced-motion rule in index.css turns that off. */}
              <div
                className="h-full bg-xp transition-[width] duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <StatTile label="Coins" value={String(coins)} valueClass="text-coin" />
              <StatTile label="Streak" value={`${streak} d`} valueClass="text-streak" />
            </div>
          </>
        ) : (
          <ShopPanel />
        )}
      </div>
    </Panel>
  );
}
