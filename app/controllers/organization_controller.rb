class OrganizationController < ApplicationController
  before_action :authenticate_user!
  before_action :set_organization
  layout 'organization'

  private

  def set_organization
    @org = current_user.organizations.find_by_slug(params[:organization_id])

    # If the org doesn't exist, redirect to a 404 page
    #   * This is a security measure to prevent users from
    #     guessing org slugs and accessing org data

    raise ActionController::RoutingError, 'Not Found' unless @org
  end
end
