declare module "react-easy-crop" {
  import { Component } from "react";

  export interface Point {
    x: number;
    y: number;
  }

  export interface Area {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface CropperProps {
    image: string;
    crop: Point;
    zoom?: number;
    rotation?: number;
    aspect?: number;
    minZoom?: number;
    maxZoom?: number;
    cropShape?: "rect" | "round";
    showGrid?: boolean;
    onCropChange: (location: Point) => void;
    onZoomChange?: (zoom: number) => void;
    onRotationChange?: (rotation: number) => void;
    onCropComplete?: (croppedArea: Area, croppedAreaPixels: Area) => void;
    style?: {
      containerStyle?: React.CSSProperties;
      cropAreaStyle?: React.CSSProperties;
      mediaStyle?: React.CSSProperties;
    };
    classes?: {
      containerClassName?: string;
      cropAreaClassName?: string;
      mediaClassName?: string;
    };
  }

  export default class Cropper extends Component<CropperProps> {}
}
