Rails.application.routes.draw do
  get "/up", to: "health#show"
  root "sessions#new"
  resource :session, only: %i[new create destroy]
  resources :organizations, only: :index
  resources :organizations, only: [] do
    resources :people, only: %i[index show] do
      resources :visits, only: :create
    end
    resources :visits, only: [] do
      post :sign_in
      post :sign_out
    end
    get "reports/people", to: "reports#people"
  end
end
