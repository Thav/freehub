Rails.application.routes.draw do
  devise_for :users

  concern :exportable do
    get :export, on: :collection
  end

  resources :organizations, except: %i[show destroy update edit]
  # :organization_id/:controller routes
  # org ids are slugs and must be 3-5 numerical, lowercase, underscore, or dash characters
  resources :organizations, only: %i[show destroy update edit], path: '', id: /[a-z0-9_-]{3,5}/ do
    scope module: :organizations, id: /\d+/ do
      resources :visits
      resources :people
      get 'reports', to: 'reports#index'
      namespace :reports do
        resources :visits, concerns: :exportable, only: %i[index]
        resources :people, concerns: :exportable, only: %i[index]
        resources :services, concerns: :exportable, only: %i[index]
        get 'summary', to: 'summary#index'
      end
    end
  end

  root to: 'home#index'

  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
end
