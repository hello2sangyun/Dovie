import { lazy, Suspense } from "react";
import { CardSkeleton, ProfileSkeleton, MessageSkeleton } from "./LazyComponent";

// 지연 로딩할 컴포넌트들
export const LazyAdminPage = lazy(() => import("@/pages/AdminPage"));
export const LazySpacePage = lazy(() => import("@/pages/SpacePage"));
export const LazyLinkedInSpacePage = lazy(() => import("@/pages/LinkedInSpacePage"));
export const LazySimpleSpacePage = lazy(() => import("@/pages/SimpleSpacePage"));
export const LazyFriendProfilePage = lazy(() => import("@/pages/FriendProfilePage"));
export const LazyStorageAnalytics = lazy(() => import("@/pages/StorageAnalytics"));

// 비즈니스 관련 컴포넌트들
export const LazyBusinessCard = lazy(() => import("@/components/BusinessCard"));
export const LazyModernBusinessCard = lazy(() => import("@/components/ModernBusinessCard"));
export const LazyBusinessProfile = lazy(() => import("@/components/BusinessProfile"));

// 설정 관련 컴포넌트들
export const LazySettingsModal = lazy(() => import("@/components/SettingsModal"));
export const LazyProfileSettingsPage = lazy(() => import("@/components/ProfileSettingsPage"));
export const LazySecuritySettingsPage = lazy(() => import("@/components/SecuritySettingsPage"));
export const LazyNotificationSettingsPage = lazy(() => import("@/components/NotificationSettingsPage"));

// 미디어 관련 컴포넌트들
export const LazyQRScannerModal = lazy(() => import("@/components/QRScannerModal"));
export const LazyImageCropper = lazy(() => import("@/components/ImageCropper"));
export const LazyVoiceRecorder = lazy(() => import("@/components/VoiceRecorder"));

// 래퍼 컴포넌트들
export const AdminPageWithSuspense = () => (
  <Suspense fallback={<CardSkeleton />}>
    <LazyAdminPage />
  </Suspense>
);

export const SpacePageWithSuspense = () => (
  <Suspense fallback={<CardSkeleton />}>
    <LazySpacePage />
  </Suspense>
);

export const LinkedInSpacePageWithSuspense = () => (
  <Suspense fallback={<CardSkeleton />}>
    <LazyLinkedInSpacePage />
  </Suspense>
);

export const SimpleSpacePageWithSuspense = () => (
  <Suspense fallback={<CardSkeleton />}>
    <LazySimpleSpacePage />
  </Suspense>
);

export const FriendProfilePageWithSuspense = () => (
  <Suspense fallback={<ProfileSkeleton />}>
    <LazyFriendProfilePage />
  </Suspense>
);

export const StorageAnalyticsWithSuspense = () => (
  <Suspense fallback={<CardSkeleton />}>
    <LazyStorageAnalytics />
  </Suspense>
);

export const BusinessCardWithSuspense = (props: any) => (
  <Suspense fallback={<ProfileSkeleton />}>
    <LazyBusinessCard {...props} />
  </Suspense>
);

export const SettingsModalWithSuspense = (props: any) => (
  <Suspense fallback={<div className="animate-pulse bg-gray-200 rounded h-96"></div>}>
    <LazySettingsModal {...props} />
  </Suspense>
);

export const QRScannerModalWithSuspense = (props: any) => (
  <Suspense fallback={<div className="animate-pulse bg-gray-200 rounded h-64"></div>}>
    <LazyQRScannerModal {...props} />
  </Suspense>
);