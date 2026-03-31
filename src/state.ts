export type View = "map" | "book"

export interface AppState {
  currentView: View
}

export const state: AppState = {
  currentView: "map" // default view
}