CREATE TABLE routes (
    route  VARCHAR(300),
    target VARCHAR(300),
    PRIMARY KEY(route),
    INDEX index_target (target)
)
