import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "react-query";
import queryClient from "./api/queryClient";
import App from "./App";
import "./tailwind.css"; 

const container = document.getElementById("root");
const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
