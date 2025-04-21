require "application_system_test_case"

class OrganizationsTest < ApplicationSystemTestCase
  setup do
    @org = organizations(:one)
  end

  test "visiting the index" do
    visit organizations_url
    assert_selector "h1", text: "Organizations"
  end

  test "should create organization" do
    visit organizations_url
    click_on "New organization"

    fill_in "Location", with: @org.location
    fill_in "Name", with: @org.name
    fill_in "Slug", with: @org.slug
    fill_in "Timezone", with: @org.timezone
    click_on "Create Organization"

    assert_text "Organization was successfully created"
    click_on "Back"
  end

  test "should update Organization" do
    visit organization_url(@org)
    click_on "Edit this organization", match: :first

    fill_in "Location", with: @org.location
    fill_in "Name", with: @org.name
    fill_in "Slug", with: @org.slug
    fill_in "Timezone", with: @org.timezone
    click_on "Update Organization"

    assert_text "Organization was successfully updated"
    click_on "Back"
  end

  test "should destroy Organization" do
    visit organization_url(@org)
    click_on "Destroy this organization", match: :first

    assert_text "Organization was successfully destroyed"
  end
end
