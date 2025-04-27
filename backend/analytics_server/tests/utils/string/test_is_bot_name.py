from mhq.utils.string import is_bot_name


def test_simple_bot_names():
    assert is_bot_name("test_bot")
    assert is_bot_name("test-bot")


def test_bot_with_prefixes_and_suffixes():
    assert is_bot_name("my_bot")
    assert is_bot_name("my-bot")
    assert is_bot_name("my bot")
    assert is_bot_name("test_bot_123")
    assert is_bot_name("test-bot-123")
    assert is_bot_name("test bot 123")


def test_special_patterns():
    assert is_bot_name("name_bot_suffix")
    assert is_bot_name("name_bot")
    assert is_bot_name("bot_name")
    assert is_bot_name("my_bot_is_cool")


def test_case_insensitivity():
    assert is_bot_name("my_BOT")
    assert is_bot_name("MY-bot")
    assert is_bot_name("My Bot")


def test_special_characters():
    assert is_bot_name("test@bot")
    assert is_bot_name("[bot]")


def test_negative_cases():
    assert not is_bot_name("robotics")
    assert not is_bot_name("lobotomy")
    assert not is_bot_name("botany")
    assert not is_bot_name("about")
    assert not is_bot_name("robotic")
    assert not is_bot_name("bots")


def test_edge_cases():
    assert not is_bot_name("")
    assert not is_bot_name(" ")
    assert not is_bot_name("12345")
