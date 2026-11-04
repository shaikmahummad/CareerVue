from __future__ import annotations

import os
from locust import HttpUser, between, task


class CareerVueUser(HttpUser):
    """Locust performance testing user simulating real student and tutor workflows."""
    wait_time = between(1, 3)

    @task(5)
    def load_homepage(self):
        self.client.get("/")

    @task(3)
    def browse_courses(self):
        self.client.get("/courses")

    @task(2)
    def view_login(self):
        self.client.get("/login")

    @task(2)
    def view_register(self):
        self.client.get("/register")

    @task(2)
    def health_check(self):
        self.client.get("/health")

