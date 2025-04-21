require "test_helper"

class OrganizationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @org = organizations(:one)
  end

  test "should get index" do
    get organizations_url
    assert_response :success
  end

  test "should get new" do
    get new_organization_url
    assert_response :success
  end

  test "should create organization" do
    assert_difference("Organization.count") do
      post organizations_url, params: { organization: { location: @org.location, name: @org.name, slug: @org.slug, timezone: @org.timezone } }
    end

    assert_redirected_to organization_url(Organization.last)
  end

  test "should show organization" do
    get organization_url(@org)
    assert_response :success
  end

  test "should get edit" do
    get edit_organization_url(@org)
    assert_response :success
  end

  test "should update organization" do
    patch organization_url(@org), params: { organization: { location: @org.location, name: @org.name, slug: @org.slug, timezone: @org.timezone } }
    assert_redirected_to organization_url(@org)
  end

  test "should destroy organization" do
    assert_difference("Organization.count", -1) do
      delete organization_url(@org)
    end

    assert_redirected_to organizations_url
  end
end
