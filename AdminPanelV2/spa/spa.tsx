import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { getRouter } from "../src/router";
import "../src/styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("PrintFlow root element is missing.");

createRoot(rootElement).render(<RouterProvider router={getRouter()} />);