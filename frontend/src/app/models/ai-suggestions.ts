// Input interfaces for AI Suggestions

export interface AISuggestionColumn {
  name: string;
  type: string;
  nullable: boolean;
  unique?: boolean;
  indexed?: boolean;
}

export interface AISuggestionRelation {
  type: 'fk';
  from_column: string;
  to_table: string;
  to_column: string;
  label?: string;
}

export interface AISuggestionLightStats {
  top_values?: Record<string, [string, number][]>;
  null_rate?: Record<string, number>;
  min_max?: Record<string, [string, string]>;
}

export interface AISuggestionTableContext {
  name: string;
  description?: string;
  row_count?: number;
  columns: AISuggestionColumn[];
  relations: AISuggestionRelation[];
  light_stats?: AISuggestionLightStats;
}

export interface AISuggestionFilter {
  column: string;
  op: string;
  value: any;
}

export interface AISuggestionUIContext {
  active_filters?: AISuggestionFilter[];
  selected_row?: Record<string, any>;
  selected_column?: string;
}

export interface AISuggestionConversation {
  last_user_message?: string;
  last_2_messages?: { role: string; text: string }[];
}

export interface AISuggestionHistory {
  recently_shown_ids?: string[];
  recently_clicked_ids?: string[];
}

export interface AISuggestionInput {
  table: AISuggestionTableContext;
  ui_context?: AISuggestionUIContext;
  conversation?: AISuggestionConversation;
  suggestion_history?: AISuggestionHistory;
}

// Output interfaces for AI Suggestions

export interface AITableSuggestion {
  id: string;
  title: string;
  message: string;
  why?: string;
  confidence?: number;
  risk?: 'low' | 'medium' | 'high';
}

export interface AINavigationSuggestion {
  id: string;
  title: string;
  target_table: string;
  prefilled_query: string;
  why?: string;
  confidence?: number;
}

export interface AISuggestionOutput {
  intent?: string[];
  table_suggestions: AITableSuggestion[];
  navigation_suggestions?: AINavigationSuggestion[];
}
