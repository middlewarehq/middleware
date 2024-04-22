import logging

LOG = logging.getLogger()


def custom_logging(func):
    def wrapper(*args, **kwargs):
        print(
            f"[{func.__name__.upper()}]", args[0]
        )  # Assuming the first argument is the log message
        return func(*args, **kwargs)

    return wrapper


LOG.error = custom_logging(LOG.error)
LOG.info = custom_logging(LOG.info)
