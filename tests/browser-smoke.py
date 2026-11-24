"""Smoke-test the production bundle against a disposable, local Supabase project.

Run the preview on 127.0.0.1:4173. Use a local Auth instance with email
auto-confirm enabled and an existing test admin. Requires Python Playwright.
"""

import os
from uuid import uuid4

from playwright.sync_api import expect, sync_playwright


ORIGIN = "http://127.0.0.1:4173"
LAW = "never-outshine-the-master"
STUDENT_EMAIL = f"student-{uuid4().hex[:10]}@example.com"
STUDENT_PASSWORD = "AuditStudent2026!local"


def sign_in(page, email, password):
    expect(page.get_by_role("heading", name="Sign in to POWERLAB")).to_be_visible()
    page.locator('input[name="email"]').fill(email)
    page.locator('input[name="password"]').fill(password)
    page.locator('form button[type="submit"]').click()


def check_layout(page):
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), page.url
    expect(page.get_by_role("main")).to_have_count(1)


def test_student(page):
    page.goto(f"{ORIGIN}/register")
    page.locator('input[name="name"]').fill("Audit Student")
    page.locator('input[name="email"]').fill(STUDENT_EMAIL)
    page.locator('input[name="password"]').fill(STUDENT_PASSWORD)
    page.locator('input[name="confirmPassword"]').fill(STUDENT_PASSWORD)
    page.locator('form button[type="submit"]').click()
    page.wait_for_url("**/student")
    expect(page.get_by_role("heading", level=1)).to_contain_text("Audit Student")

    page.get_by_role("button", name="Sign out").click()
    page.wait_for_url("**/login")
    page.goto(f"{ORIGIN}/assessment/{LAW}")
    expect(page.get_by_role("heading", level=1)).to_contain_text("Never Outshine")
    page.get_by_role("link", name="Sign in to submit").click()
    sign_in(page, STUDENT_EMAIL, STUDENT_PASSWORD)
    page.wait_for_url(f"**/assessment/{LAW}")
    page.get_by_role("button", name="Explain your contribution", exact=False).click()
    page.get_by_role("button", name="Submit assessment").click()
    expect(page.get_by_role("heading", name="Congratulations! You passed.")).to_be_visible()
    check_layout(page)

    page.goto(f"{ORIGIN}/laws/{LAW}")
    page.get_by_role("button", name="Bookmark", exact=True).click()
    page.get_by_role("button", name="Mark as completed").click()
    expect(page.get_by_role("button", name="Mark as completed")).to_have_attribute("aria-pressed", "true")
    check_layout(page)

    page.goto(f"{ORIGIN}/student")
    expect(page.get_by_text("Never Outshine the Master", exact=True).first).to_be_visible()
    page.goto(f"{ORIGIN}/admin")
    page.wait_for_url("**/student")
    page.goto(f"{ORIGIN}/assessments")
    expect(page.get_by_role("link", name="Start assessment")).to_have_count(48)
    check_layout(page)


def test_admin(page, email, password):
    page.goto(f"{ORIGIN}/admin/certification")
    sign_in(page, email, password)
    page.wait_for_url("**/admin/certification")

    page.get_by_role("button", name="Add question").click()
    draft = page.locator("article").filter(has=page.get_by_label("Question (English)")).last
    draft.get_by_label("Question (English)").fill("Audit fixture question")
    draft.get_by_label("প্রশ্ন (বাংলা)").fill("পরীক্ষামূলক প্রশ্ন")
    for index in range(1, 5):
        draft.get_by_label(f"English option {index}").fill(f"Choice {index}")
        draft.get_by_label(f"বাংলা বিকল্প {index}").fill(f"বিকল্প {index}")
    draft.get_by_role("button", name="Save question").click()
    expect(page.get_by_role("status")).to_contain_text("Question saved.")
    assert not draft.get_by_role("checkbox").is_checked()

    page.goto(f"{ORIGIN}/admin")
    expect(page.get_by_role("heading", name="Dashboard")).to_be_visible()
    check_layout(page)
    assert "correctOption" not in page.evaluate("localStorage.getItem('powerlab:shared-content:v3') || ''")
    assert page.evaluate("localStorage.getItem('powerlab:shared-content:v2')") is None

    page.goto(f"{ORIGIN}/admin/users")
    user = page.locator("article").filter(has_text=STUDENT_EMAIL)
    expect(user).to_be_visible()
    page.on("dialog", lambda dialog: dialog.accept())
    user.get_by_role("combobox").select_option("admin")
    expect(page.get_by_role("status")).to_contain_text("Account role updated.")
    user.get_by_role("combobox").select_option("student")
    expect(page.get_by_role("status")).to_contain_text("Account role updated.")


if __name__ == "__main__":
    admin_email = os.environ["POWERLAB_TEST_ADMIN_EMAIL"]
    admin_password = os.environ["POWERLAB_TEST_ADMIN_PASSWORD"]
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.environ.get("POWERLAB_TEST_CHROMIUM"))
        for role, viewport in (("student", 360), ("admin", 1280)):
            page = browser.new_page(viewport={"width": viewport, "height": 850})
            page.set_default_timeout(10_000)
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            if role == "student":
                test_student(page)
            else:
                test_admin(page, admin_email, admin_password)
            assert not errors, errors
            page.close()
            print(f"{role} browser flow passed")
