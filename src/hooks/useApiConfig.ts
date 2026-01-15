// Hook to access API configuration with fallback priority:
// 1. Environment variables (.env.local)
// 2. localStorage (user login credentials)
// 3. Default fallback values

export const useApiConfig = () => {
  const getApiUrl = (): string => {
    // Try environment variable first, then localStorage, then fallback
    return (
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined" && localStorage.getItem("API_URL")) ||
      "http://localhost:8080/api_jsonrpc.php"
    );
  };

  const getApiToken = (): string => {
    // Try environment variable first, then localStorage, then fallback
    return (
      process.env.NEXT_PUBLIC_API_TOKEN ||
      (typeof window !== "undefined" && localStorage.getItem("API_TOKEN")) ||
      "b7b3f30c91bf343ff7ea4b169e08c7746c7e1c166f0aefb7f2930921c6a7690b"
    );
  };

  return {
    apiUrl: getApiUrl(),
    apiToken: getApiToken(),
  };
};
