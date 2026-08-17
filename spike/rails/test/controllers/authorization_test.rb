require "test_helper"

class AuthorizationTest < ActionDispatch::IntegrationTest
  setup do
    @forgery_protection = ActionController::Base.allow_forgery_protection
    ActionController::Base.allow_forgery_protection = false
  end

  teardown { ActionController::Base.allow_forgery_protection = @forgery_protection }

  test "a signed-in member cannot read another organization" do
    user = User.create!(login: "operator", email: "operator@example.test", name: "Operator", password: "spike-password")
    allowed = Organization.create!(name: "Allowed", key: "allowed", timezone: "America/Chicago")
    other = Organization.create!(name: "Other", key: "other", timezone: "America/Chicago")
    Membership.create!(organization: allowed, user:, role: "operator")
    post "/session", params: { login: user.login, password: "spike-password" }
    assert_response :redirect
    follow_redirect!
    get "/organizations/#{other.id}/people"
    assert_response :not_found
  end
end
