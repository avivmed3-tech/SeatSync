import React from "react";
import { Composition } from "remotion";
import { RSVPVideo } from "./RSVPVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="RSVPNotification"
      component={RSVPVideo}
      durationInFrames={210}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
