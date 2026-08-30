// Shared browser-test setup. Keep dependency-free for reproducible offline installs.
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
