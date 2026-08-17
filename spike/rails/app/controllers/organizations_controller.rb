class OrganizationsController < ApplicationController
  before_action :require_user

  def index
    @organizations = current_user.organizations.order(:name)
  end
end
