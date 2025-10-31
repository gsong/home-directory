"""
Shared utilities for Toggl API scripts.
"""

import json
import sys
from datetime import date, datetime, time
from pathlib import Path
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo

import click
import requests


def get_cache_dir() -> Path:
    """Get the cache directory."""
    cache_dir = Path.home() / ".cache" / "toggl"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def get_project_cache_path() -> Path:
    """Get the path to the project cache file."""
    return get_cache_dir() / "projects.json"


def get_client_cache_path() -> Path:
    """Get the path to the client cache file."""
    return get_cache_dir() / "clients.json"


def load_project_cache() -> Dict[str, str]:
    """Load project ID to name mapping from cache."""
    cache_path = get_project_cache_path()
    if cache_path.exists():
        try:
            with open(cache_path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def save_project_cache(cache: Dict[str, str]) -> None:
    """Save project ID to name mapping to cache."""
    cache_path = get_project_cache_path()
    try:
        with open(cache_path, "w") as f:
            json.dump(cache, f, indent=2)
    except IOError:
        # Silently fail if we can't write cache
        pass


def load_client_cache() -> Dict[str, str]:
    """Load client ID to name mapping from cache."""
    cache_path = get_client_cache_path()
    if cache_path.exists():
        try:
            with open(cache_path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def save_client_cache(cache: Dict[str, str]) -> None:
    """Save client ID to name mapping to cache."""
    cache_path = get_client_cache_path()
    try:
        with open(cache_path, "w") as f:
            json.dump(cache, f, indent=2)
    except IOError:
        # Silently fail if we can't write cache
        pass


def get_workspace_id(api_token: str) -> Optional[int]:
    """Get the user's default workspace ID."""
    response = requests.get(
        "https://api.track.toggl.com/api/v9/me", auth=(api_token, "api_token")
    )

    if response.status_code != 200:
        return None

    user_data = response.json()
    return user_data.get("default_workspace_id")


def fetch_clients(api_token: str) -> Dict[str, str]:
    """Fetch all clients from Toggl API and return ID to name mapping."""
    workspace_id = get_workspace_id(api_token)
    if not workspace_id:
        return {}

    # Fetch clients for the workspace
    response = requests.get(
        f"https://api.track.toggl.com/api/v9/workspaces/{workspace_id}/clients",
        auth=(api_token, "api_token"),
    )

    if response.status_code != 200:
        return {}

    clients = response.json()
    return {str(c["id"]): c["name"] for c in clients if "id" in c and "name" in c}


def fetch_projects(api_token: str) -> Dict[str, str]:
    """Fetch all projects from Toggl API and return ID to name mapping."""
    workspace_id = get_workspace_id(api_token)
    if not workspace_id:
        return {}

    # Fetch projects for the workspace
    response = requests.get(
        f"https://api.track.toggl.com/api/v9/workspaces/{workspace_id}/projects",
        auth=(api_token, "api_token"),
    )

    if response.status_code != 200:
        return {}

    projects = response.json()
    return {str(p["id"]): p["name"] for p in projects if "id" in p and "name" in p}


def fetch_projects_with_clients(
    api_token: str,
) -> tuple[Dict[str, str], Dict[str, str]]:
    """
    Fetch all projects and return both name and client mappings.

    Returns:
        Tuple of (project_id→name, project_id→client_id)
    """
    workspace_id = get_workspace_id(api_token)
    if not workspace_id:
        return {}, {}

    # Fetch projects for the workspace
    response = requests.get(
        f"https://api.track.toggl.com/api/v9/workspaces/{workspace_id}/projects",
        auth=(api_token, "api_token"),
    )

    if response.status_code != 200:
        return {}, {}

    projects = response.json()
    project_names = {}
    project_clients = {}

    for p in projects:
        if "id" in p and "name" in p:
            project_id = str(p["id"])
            project_names[project_id] = p["name"]
            # cid is the client ID
            if "cid" in p and p["cid"]:
                project_clients[project_id] = str(p["cid"])

    return project_names, project_clients


def get_project_name(project_id: int, api_token: str) -> str:
    """Get project name from cache or fetch if not cached."""
    project_id_str = str(project_id)

    # Load cache
    cache = load_project_cache()

    # Check if project is in cache
    if project_id_str in cache:
        return cache[project_id_str]

    # Not in cache, fetch all projects and update cache
    fresh_projects = fetch_projects(api_token)

    # Update cache with fresh data (this replaces old entries)
    save_project_cache(fresh_projects)

    # Return the project name if found, otherwise return the ID as string
    return fresh_projects.get(project_id_str, f"Project {project_id}")


def get_client_name(client_id: int, api_token: str) -> str:
    """Get client name from cache or fetch if not cached."""
    client_id_str = str(client_id)

    # Load cache
    cache = load_client_cache()

    # Check if client is in cache
    if client_id_str in cache:
        return cache[client_id_str]

    # Not in cache, fetch all clients and update cache
    fresh_clients = fetch_clients(api_token)

    # Update cache with fresh data (this replaces old entries)
    save_client_cache(fresh_clients)

    # Return the client name if found, otherwise return the ID as string
    return fresh_clients.get(client_id_str, f"Client {client_id}")


def get_time_entries(
    api_token: str, start_date: date, end_date: Optional[date] = None
) -> List[Dict]:
    """
    Fetch time entries from Toggl API for a date range.

    Args:
        api_token: Toggl API token
        start_date: Start date (inclusive)
        end_date: End date (inclusive). If None, uses start_date.

    Returns:
        List of time entry dictionaries
    """
    if end_date is None:
        end_date = start_date

    # Get local timezone
    local_tz = datetime.now().astimezone().tzinfo

    # Convert date to start/end datetime in local time
    start_dt = datetime.combine(start_date, time.min).replace(tzinfo=local_tz)
    end_dt = datetime.combine(end_date, time.max).replace(tzinfo=local_tz)

    # Convert to UTC for API
    start_utc = start_dt.astimezone(ZoneInfo("UTC"))
    end_utc = end_dt.astimezone(ZoneInfo("UTC"))

    # Format for API (ISO 8601)
    start_str = start_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    end_str = end_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z")

    url = "https://api.track.toggl.com/api/v9/me/time_entries"
    params = {"start_date": start_str, "end_date": end_str}

    response = requests.get(url, params=params, auth=(api_token, "api_token"))

    if response.status_code == 403:
        click.echo("Error: Authentication failed. Check your API token.", err=True)
        sys.exit(1)
    elif response.status_code == 402:
        click.echo("Error: API quota exceeded.", err=True)
        sys.exit(1)
    elif response.status_code != 200:
        click.echo(
            f"Error: API request failed with status {response.status_code}", err=True
        )
        sys.exit(1)

    return response.json()


def parse_time(time_str: str, local_tz) -> datetime:
    """Parse ISO 8601 time string and convert to local timezone."""
    dt = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
    return dt.astimezone(local_tz)


# Constants
SECONDS_PER_HOUR = 3600
SECONDS_PER_MINUTE = 60


def get_local_timezone():
    """Get the local timezone."""
    return datetime.now().astimezone().tzinfo


def parse_date_argument(date_str: str) -> date:
    """
    Parse and validate a date string in YYYY-MM-DD format.

    Args:
        date_str: Date string in YYYY-MM-DD format

    Returns:
        Parsed date object

    Raises:
        SystemExit: If date format is invalid
    """
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        click.echo(f"Error: Invalid date format '{date_str}'. Use YYYY-MM-DD", err=True)
        sys.exit(1)


def validate_api_token(token: Optional[str]) -> None:
    """
    Validate that an API token is provided, exit if not.

    Args:
        token: API token to validate

    Raises:
        SystemExit: If token is not provided
    """
    if not token:
        click.echo(
            "Error: API token required. Set TOGGL_API_TOKEN environment variable or use --token",
            err=True,
        )
        sys.exit(1)


def format_duration_str(seconds: int) -> str:
    """
    Format duration in seconds to human-readable string.

    Args:
        seconds: Duration in seconds

    Returns:
        Formatted string like "2h 30m" or "45m"
    """
    hours = seconds // SECONDS_PER_HOUR
    minutes = (seconds % SECONDS_PER_HOUR) // SECONDS_PER_MINUTE

    if hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"


def format_hours_float(hours: float) -> str:
    """
    Format hours as float for display (to 2 decimal places).

    Args:
        hours: Hours to format

    Returns:
        Formatted string like "2.50" or "-" for zero
    """
    if hours == 0:
        return "-"
    return f"{hours:.2f}"


def calculate_entry_duration(entry: Dict, local_tz) -> float:
    """
    Calculate duration of a time entry in seconds.

    Handles both completed entries (with 'duration' field) and running entries
    (without 'stop' time, calculates from start to now).

    Args:
        entry: Time entry dictionary from Toggl API
        local_tz: Local timezone info

    Returns:
        Duration in seconds
    """
    if entry.get("duration", 0) > 0:
        return entry["duration"]
    else:
        # Running entry - calculate from start to now
        start = parse_time(entry["start"], local_tz)
        now = datetime.now(local_tz)
        return (now - start).total_seconds()
