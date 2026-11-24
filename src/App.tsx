import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Layout from '@/components/Layout';
import ScrollToTop from '@/components/ScrollToTop';
import { LanguageProvider } from '@/context/LanguageContext';
import { ContentProvider } from '@/context/ContentContext';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

const HomePage = lazy(() => import('@/pages/HomePage'));
const LawsPage = lazy(() => import('@/pages/LawsPage'));
const LessonPage = lazy(() => import('@/pages/LessonPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const AssessmentsPage = lazy(() => import('@/pages/AssessmentsPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const StudentDashboardPage = lazy(
  () => import('@/pages/StudentDashboardPage')
);
const AssessmentPage = lazy(() => import('@/pages/AssessmentPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const AdminDashboardPage = lazy(
  () => import('@/pages/admin/AdminDashboardPage')
);
const AdminSectionPage = lazy(
  () => import('@/pages/admin/AdminSectionPage')
);
const AdminCertificationPage = lazy(
  () => import('@/pages/admin/AdminCertificationPage')
);
const AdminLanguagesPage = lazy(
  () => import('@/pages/admin/AdminLanguagesPage')
);
const CertificationPage = lazy(() => import('@/pages/CertificationPage'));
const CertificateVerificationPage = lazy(
  () => import('@/pages/CertificateVerificationPage')
);
const AdminLawsPage = lazy(
  () => import('@/pages/admin/AdminLawsPage')
);

function PageFallback() {
  return (
    <div className="container-content flex items-center justify-center py-32">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest-300 border-t-forest-600" />
    </div>
  );
}

function PublicLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ContentProvider>
        <LanguageProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/laws" element={<LawsPage />} />
                  <Route path="/laws/:slug" element={<LessonPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/assessments" element={<AssessmentsPage />} />
                  <Route path="/verify-certificate" element={<CertificateVerificationPage />} />

                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  <Route
                    path="/assessment/:lawSlug"
                    element={<AssessmentPage />}
                  />

                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                <Route element={<ProtectedRoute requiredRole="student" />}>
                  <Route
                    path="/student"
                    element={<StudentDashboardPage />}
                  />
                  <Route path="/certification" element={<CertificationPage />} />
                  <Route path="/assessment/final" element={<CertificationPage />} />
                </Route>

                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboardPage />} />
                    <Route path="laws" element={<AdminLawsPage />} />
                    <Route path="certification" element={<AdminCertificationPage />} />
                    <Route path="languages" element={<AdminLanguagesPage />} />
                    <Route path="categories" element={<AdminSectionPage />} />
                    <Route path="assessments" element={<AdminSectionPage />} />
                    <Route path="users" element={<AdminSectionPage />} />
                    <Route path="settings" element={<AdminSectionPage />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </LanguageProvider>
      </ContentProvider>
    </AuthProvider>
  );
}
