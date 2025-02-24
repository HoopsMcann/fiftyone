import { Bar, useTheme } from "@fiftyone/components";
import { VideoLooker } from "@fiftyone/looker";
import * as fos from "@fiftyone/state";
import { currentSlice, hasPinnedSlice } from "@fiftyone/state";
import { Checkbox } from "@material-ui/core";
import React, { MutableRefObject, useRef } from "react";
import { useRecoilValue } from "recoil";
import { ModalActionsRow } from "../Actions";
import Pin from "./Pin";

const SelectableBar: React.FC<
  React.PropsWithChildren<{
    sampleId: string;
    style?: Omit<React.CSSProperties, "cursor">;
    hoveringRef?: MutableRefObject<boolean>;
  }>
> = ({ hoveringRef, sampleId, children, style = {} }) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const select = fos.useSelectSample();
  const selected = useRecoilValue(fos.selectedSamples).has(sampleId);

  return (
    <Bar
      onMouseEnter={() => hoveringRef && (hoveringRef.current = true)}
      onMouseLeave={() => hoveringRef && (hoveringRef.current = false)}
      ref={headerRef}
      onClick={(event) =>
        event.target === headerRef.current && select(sampleId)
      }
      style={{ cursor: "pointer", ...style }}
    >
      <div>
        <Checkbox
          disableRipple
          title={selected ? "Select sample" : "Selected"}
          checked={selected}
          style={{ color: theme.brand }}
          onClick={() => select(sampleId)}
        />
      </div>
      {children}
    </Bar>
  );
};

export const SampleBar: React.FC<{
  sampleId: string;
  lookerRef: React.MutableRefObject<VideoLooker | undefined>;
  visible?: boolean;
  hoveringRef: MutableRefObject<boolean>;
}> = ({ hoveringRef, lookerRef, sampleId, visible }) => {
  return visible ? (
    <SelectableBar hoveringRef={hoveringRef} sampleId={sampleId}>
      <ModalActionsRow lookerRef={lookerRef} />
    </SelectableBar>
  ) : null;
};

export const GroupBar: React.FC<{
  lookerRef: React.MutableRefObject<VideoLooker | undefined>;
}> = ({ lookerRef }) => {
  const slice = useRecoilValue(currentSlice(true));
  const hasPinned = useRecoilValue(hasPinnedSlice);
  return (
    <Bar
      style={{
        position: "relative",
        top: "unset",
        left: "unset",
        borderBottom: `1px solid var(--background-dark-border)`,
        zIndex: 10000,
      }}
    >
      <div>
        {hasPinned && (
          <div
            style={{
              color: "var(--font)",
              display: "flex",
              fontSize: "1.2rem",
              fontWeight: "bold",
              alignItems: "center",
              columnGap: "0.25rem",
            }}
          >
            <Pin />
            {slice} is pinned
          </div>
        )}
      </div>
      <ModalActionsRow lookerRef={lookerRef} />
    </Bar>
  );
};

export const GroupSampleBar: React.FC<{
  pinned: boolean;
  sampleId: string;
  slice: string;
  hoveringRef: MutableRefObject<boolean>;
}> = ({ hoveringRef, pinned, sampleId, slice }) => {
  return (
    <SelectableBar hoveringRef={hoveringRef} sampleId={sampleId}>
      {pinned && (
        <div
          style={{
            color: "var(--font)",
            display: "flex",
            fontSize: "1.2rem",
            fontWeight: "bold",
            alignItems: "center",
            columnGap: "0.25rem",
          }}
        >
          {slice}
          <Pin />
        </div>
      )}
    </SelectableBar>
  );
};
