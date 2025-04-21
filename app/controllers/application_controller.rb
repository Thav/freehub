class ApplicationController < ActionController::Base
  private

  def after_sign_in_path_for(_resource)
    current_user.roles.count == 1 ? 
      organization_path(current_user.roles.first.organization) :
      organizations_path
  end
end
