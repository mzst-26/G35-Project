"use client";

import { BrowserRouter } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

export function Providers({ children }: Props) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

