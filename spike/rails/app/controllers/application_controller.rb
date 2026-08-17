class ApplicationController < ActionController::Base
  helper_method :current_user
  private
  def current_user
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
  end
  def require_user
    redirect_to new_session_path, alert: "Log in required" unless current_user
  end
  def organization
    @organization ||= current_user.organizations.find(params[:organization_id])
  end
end
