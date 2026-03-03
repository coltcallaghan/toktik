export interface GenerateContentRequest {
  trend_name: string;
  trend_description: string;
  account_id: string;
  account_username: string;
  niche: string | null;
}

export interface GenerateContentResponse {
  title: string;
  hook: string;
  script: string;
  captions: string;
  hashtags: string[];
  content_id: string;
}
