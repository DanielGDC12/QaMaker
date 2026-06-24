import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do projeto: há outros lockfiles acima na árvore de diretórios.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
