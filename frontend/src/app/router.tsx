import { createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import DashboardPage from "@/pages/DashboardPage";
import StockDetailPage from "@/pages/StockDetailPage";
import WatchlistPage from "@/pages/WatchlistPage";
import PortfolioPage from "@/pages/PortfolioPage";
import ComparePage from "@/pages/ComparePage";
import InsiderFeedPage from "@/pages/InsiderFeedPage";
import NotFoundPage from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/stock/:symbol", element: <StockDetailPage /> },
      { path: "/compare", element: <ComparePage /> },
      { path: "/watchlist", element: <WatchlistPage /> },
      { path: "/portfolio", element: <PortfolioPage /> },
      { path: "/insider-feed", element: <InsiderFeedPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
