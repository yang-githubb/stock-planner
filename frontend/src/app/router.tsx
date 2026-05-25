import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import DashboardPage from "@/pages/DashboardPage";
import SearchPage from "@/pages/SearchPage";
import StockDetailPage from "@/pages/StockDetailPage";
import WatchlistPage from "@/pages/WatchlistPage";
import PortfolioPage from "@/pages/PortfolioPage";
import NotFoundPage from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/stock/:symbol", element: <StockDetailPage /> },
      { path: "/watchlist", element: <WatchlistPage /> },
      { path: "/portfolio", element: <PortfolioPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
