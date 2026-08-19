import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Footer from "./components/Footer";
import CookieBanner from "./components/CookieBanner";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ConfirmEmailPage from "./pages/ConfirmEmailPage";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import DeckDetailPage from "./pages/DeckDetailPage";
import SessionManagePage from "./pages/SessionManagePage";
import ReviewSlidesPage from "./pages/ReviewSlidesPage";
import ReviewQuestionsPage from "./pages/ReviewQuestionsPage";
import ReviewPracticePage from "./pages/ReviewPracticePage";
import PrivacyPage from "./pages/PrivacyPage";
import ImprintPage from "./pages/ImprintPage";

import JoinPage from "./pages/JoinPage";
import SlideViewerPage from "./pages/SlideViewerPage";
import CommentsPage from "./pages/CommentsPage";
import QuestionsPage from "./pages/QuestionsPage";
import PracticeQAPage from "./pages/PracticeQAPage";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Speaker */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/confirm-email/:token" element={<ConfirmEmailPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decks/:deckId"
          element={
            <ProtectedRoute>
              <DeckDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decks/:deckId/sessions/:sessionId"
          element={
            <ProtectedRoute>
              <SessionManagePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decks/:deckId/sessions/:sessionId/review/slides"
          element={
            <ProtectedRoute>
              <ReviewSlidesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decks/:deckId/sessions/:sessionId/review/questions"
          element={
            <ProtectedRoute>
              <ReviewQuestionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decks/:deckId/sessions/:sessionId/review/practice"
          element={
            <ProtectedRoute>
              <ReviewPracticePage />
            </ProtectedRoute>
          }
        />

        {/* Participant (no account) */}
        <Route path="/j/:joinCode" element={<JoinPage />} />
        <Route path="/j/:joinCode/view" element={<SlideViewerPage />} />
        <Route path="/j/:joinCode/view/:slideIdx" element={<SlideViewerPage />} />
        <Route path="/j/:joinCode/comments" element={<CommentsPage />} />
        <Route path="/j/:joinCode/questions" element={<QuestionsPage />} />
        <Route path="/j/:joinCode/practice" element={<PracticeQAPage />} />

        {/* Legal */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/imprint" element={<ImprintPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
      <CookieBanner />
    </>
  );
}
