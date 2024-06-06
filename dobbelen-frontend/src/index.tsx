import React from "react";
import ReactDOM from "react-dom";
import { QueryClientProvider } from "react-query";
import queryClient from "./api/queryClient";
import App from "./App";
import "./index.css";
import "./tailwind.css"; 

ReactDOM.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
