import { lazy, Suspense, useEffect } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { MobileNav } from "./components/MobileNav";
import Home from "./pages/Home";

const Reels = lazy(() => import("./pages/Reels"));
const Search = lazy(() => import("./pages/Search"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Look = lazy(() => import("./pages/Look"));
const Category = lazy(() => import("./pages/Category"));
const Deals = lazy(() => import("./pages/Deals"));
const About = lazy(() => import("./pages/About"));

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Wait a frame so the target section has rendered.
      requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }));
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

function SiteLayout() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route
          path="/reels"
          element={
            <Suspense fallback={<div className="fixed inset-0 bg-neutral-950" />}>
              <Reels />
            </Suspense>
          }
        />
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="look/:slug" element={<Look />} />
          <Route path="category/:slug" element={<Category />} />
          <Route path="deals" element={<Deals />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
