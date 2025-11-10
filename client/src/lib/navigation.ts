type SetLocationFn = (to: string, options?: { replace?: boolean }) => void;

class NavigationService {
  private setLocation: SetLocationFn | null = null;
  private pendingNavigation: string | null = null;

  registerNavigator(setLocationFn: SetLocationFn) {
    this.setLocation = setLocationFn;
    console.log('✅ Navigation service registered');

    if (this.pendingNavigation) {
      console.log('🔄 Executing pending navigation:', this.pendingNavigation);
      this.navigate(this.pendingNavigation);
      this.pendingNavigation = null;
    }
  }

  navigate(to: string) {
    if (this.setLocation) {
      console.log('🔄 Navigating to:', to);
      this.setLocation(to);
    } else {
      console.log('⚠️ Navigator not registered yet, storing pending navigation:', to);
      this.pendingNavigation = to;
    }
  }

  isRegistered(): boolean {
    return this.setLocation !== null;
  }
}

export const navigationService = new NavigationService();
